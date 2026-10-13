import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { currencies, fxRateRuns, fxRates } from '@/lib/db/schema';
import { invalid, notFound } from '@/lib/api/errors';

/** Admin currencies service. USD is the fixed base currency for all stored prices. */
export const BASE_CURRENCY = 'USD';

export const toggleCurrencySchema = z.object({ isActive: z.boolean() });
export type ToggleCurrencyInput = z.infer<typeof toggleCurrencySchema>;

export interface AdminCurrency {
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
  isBase: boolean;
  rateToUsd: number | null;
  rateSource: string | null;
  rateFetchedAt: string | null;
}

export async function listCurrencies(): Promise<AdminCurrency[]> {
  const rows = await db
    .select({
      code: currencies.code,
      name: currencies.name,
      symbol: currencies.symbol,
      isActive: currencies.isActive,
      rateToUsd: fxRates.rateToUsd,
      rateSource: fxRates.source,
      rateFetchedAt: fxRates.fetchedAt,
    })
    .from(currencies)
    .leftJoin(fxRates, eq(fxRates.currencyCode, currencies.code))
    .orderBy(asc(currencies.sortOrder));

  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    isActive: row.isActive,
    isBase: row.code === BASE_CURRENCY,
    rateToUsd: row.rateToUsd === null ? null : Number(row.rateToUsd),
    rateSource: row.rateSource,
    rateFetchedAt: row.rateFetchedAt,
  }));
}

export async function setCurrencyActive(code: string, isActive: boolean): Promise<AdminCurrency> {
  const normalized = code.trim().toUpperCase();

  // Base currency cannot be disabled.
  if (normalized === BASE_CURRENCY && !isActive) {
    throw invalid(`${BASE_CURRENCY} is the base currency and can't be disabled.`);
  }

  const [existing] = await db
    .select({ code: currencies.code })
    .from(currencies)
    .where(eq(currencies.code, normalized))
    .limit(1);
  if (!existing) throw notFound('Currency not found.');

  await db.update(currencies).set({ isActive }).where(eq(currencies.code, normalized));

  const all = await listCurrencies();
  const updated = all.find((currency) => currency.code === normalized);
  if (!updated) throw notFound('Currency not found.');
  return updated;
}

/** Lists FX refresh run history, newest first. */
export async function listFxRuns(limit = 20) {
  return db.select().from(fxRateRuns).orderBy(desc(fxRateRuns.ranAt)).limit(limit);
}
