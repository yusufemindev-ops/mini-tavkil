import { and, eq, gte } from 'drizzle-orm';
import { createDb, db as requestDb } from '@/lib/db';
import { currencies, fxRateRuns, fxRates } from '@/lib/db/schema';

/**
 * FX rate refresh, ported from Tavkil's Nest service.
 *
 * Every guard here survived the port because each one prevents a specific, real
 * failure — none of it is defensive noise:
 *
 *   - **Pegged currencies are never fetched.** SAR and AED are fixed by their
 *     central banks. Asking a market feed for them invites a wrong answer that
 *     overwrites a rate that was correct by definition.
 *   - **A move larger than 20% in a day is refused** and the previous rate kept.
 *     A free key-less provider returning garbage — or being compromised — would
 *     otherwise silently reprice the whole catalogue.
 *   - **It never throws.** A provider outage records a failed run and leaves the
 *     last-good rates in place. Conversion is decorative here (no public prices
 *     at all), so an FX failure must never surface to anyone.
 *
 * The Nest version ran on a 2-hourly `@Cron` gated to the worker process. Workers
 * have no long-lived process, so the schedule is a Cloudflare Cron Trigger and
 * the "one success per day, retry until then" behaviour comes from the
 * `hasSucceededToday` guard, exactly as it did before.
 */

const BASE_CURRENCY = 'USD';
const PEGGED = new Set(['SAR', 'AED']);
const MAX_JUMP = 0.2;
const FETCH_TIMEOUT_MS = 10_000;

export interface FxRunResult {
  status: 'success' | 'failed';
  source: string | null;
  error: string | null;
  rates: Record<string, number> | null;
  skipped: string[];
}

type Db = ReturnType<typeof createDb>;

/** For the cron handler, which runs outside any request context. */
export function fxDbFromEnv(connectionString: string): Db {
  return createDb(connectionString);
}

/**
 * Has a refresh already succeeded today (UTC)?
 *
 * This is what turns a 2-hourly trigger into "once a day, retrying until it
 * works" without a separate retry scheduler — the same behaviour Tavkil's
 * `@Cron` had, minus the worker-process gate that Workers can't provide.
 */
export async function hasSucceededToday(db: Db = requestDb): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({ id: fxRateRuns.id })
    .from(fxRateRuns)
    .where(and(eq(fxRateRuns.status, 'success'), gte(fxRateRuns.ranAt, startOfDay.toISOString())))
    .limit(1);

  return Boolean(row);
}

/** Fetch → validate → upsert → log. Always resolves, and always records a run. */
export async function refreshFxRates(db: Db = requestDb): Promise<FxRunResult> {
  let result: FxRunResult;

  try {
    const codes = await floatingCodes(db);
    if (codes.length === 0) {
      result = { status: 'success', source: 'none', error: null, rates: {}, skipped: [] };
    } else {
      const fetched = await fetchWithFallback(codes);
      const { applied, skipped } = await applyRates(db, fetched.rates, fetched.source);
      result = { status: 'success', source: fetched.source, error: null, rates: applied, skipped };
    }
  } catch (error) {
    const message = (error as Error).message;
    console.warn(`FX refresh failed: ${message}`);
    result = { status: 'failed', source: null, error: message, rates: null, skipped: [] };
  }

  await db.insert(fxRateRuns).values({
    status: result.status,
    source: result.source,
    error: result.error,
    rates: result.rates,
  });

  return result;
}

/** Active, non-USD, non-pegged currencies — the ones that actually float. */
async function floatingCodes(db: Db): Promise<string[]> {
  const rows = await db
    .select({ code: currencies.code })
    .from(currencies)
    .where(eq(currencies.isActive, true));
  return rows.map((row) => row.code).filter((code) => code !== BASE_CURRENCY && !PEGGED.has(code));
}

interface FetchResult {
  source: string;
  rates: Record<string, number>;
}

async function fetchWithFallback(codes: string[]): Promise<FetchResult> {
  try {
    return await fetchFrankfurter(codes);
  } catch (primary) {
    console.warn(`Frankfurter failed: ${(primary as Error).message}; trying open.er-api`);
    try {
      return await fetchOpenErApi(codes);
    } catch (fallback) {
      throw new Error(
        `both providers failed (frankfurter: ${(primary as Error).message}; ` +
          `open-er-api: ${(fallback as Error).message})`,
      );
    }
  }
}

async function fetchFrankfurter(codes: string[]): Promise<FetchResult> {
  const url = `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${codes.join(',')}`;
  const data = (await getJson(url)) as { rates?: Record<string, number> };
  const rates = pickValid(codes, data.rates ?? {});
  if (Object.keys(rates).length === 0) throw new Error('no usable rates returned');
  return { source: 'frankfurter', rates };
}

async function fetchOpenErApi(codes: string[]): Promise<FetchResult> {
  const data = (await getJson('https://open.er-api.com/v6/latest/USD')) as {
    rates?: Record<string, number>;
  };
  const rates = pickValid(codes, data.rates ?? {});
  if (Object.keys(rates).length === 0) throw new Error('no usable rates returned');
  return { source: 'open-er-api', rates };
}

/** Keep only requested codes whose value is a finite positive number. */
export function pickValid(codes: string[], rates: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const code of codes) {
    const rate = rates[code];
    if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) out[code] = rate;
  }
  return out;
}

/** True when a new rate is too far from the current one to be believable. */
export function isImplausibleJump(current: number, next: number): boolean {
  if (!(current > 0)) return false;
  return Math.abs(next - current) / current > MAX_JUMP;
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function applyRates(
  db: Db,
  rates: Record<string, number>,
  source: string,
): Promise<{ applied: Record<string, number>; skipped: string[] }> {
  const applied: Record<string, number> = {};
  const skipped: string[] = [];
  const now = new Date().toISOString();

  const existing = await db
    .select({ code: fxRates.currencyCode, rate: fxRates.rateToUsd })
    .from(fxRates);
  const currentByCode = new Map(existing.map((row) => [row.code.trim(), Number(row.rate)]));

  for (const [code, rate] of Object.entries(rates)) {
    const current = currentByCode.get(code);
    if (current !== undefined && isImplausibleJump(current, rate)) {
      console.warn(
        `Skipping ${code}: ${rate} deviates >${MAX_JUMP * 100}% from current ${current}`,
      );
      skipped.push(code);
      continue;
    }

    await db
      .insert(fxRates)
      .values({ currencyCode: code, rateToUsd: String(rate), source, fetchedAt: now })
      .onConflictDoUpdate({
        target: fxRates.currencyCode,
        set: { rateToUsd: String(rate), source, fetchedAt: now },
      });
    applied[code] = rate;
  }

  return { applied, skipped };
}
