import type { Context } from 'hono';
import { createFactory } from 'hono/factory';
import type { ZodType } from 'zod';
import { requireAdmin, requirePermission, type AdminUser } from '@/lib/auth-guard';
import { requireBuyerSession } from '@/lib/buyer-guard';
import { invalid, rateLimited } from '@/lib/api/errors';
import { recordAudit } from '@/lib/services/audit-log';
import type { AuditResourceType } from '@/lib/services/audit-log-schema';

export type R2BucketLike = {
  put: (
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
};

export type AppEnv = {
  Bindings: {
    DATABASE_URL?: string;
    IMAGES?: R2BucketLike;
  };
  Variables: {
    admin: AdminUser;
    buyer: Awaited<ReturnType<typeof requireBuyerSession>>;
  };
};

export const factory = createFactory<AppEnv>();

const MAX_RATE_LIMIT_BUCKETS = 2000;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

/** Extracts the caller IP address from Cloudflare or proxy headers. */
export function clientIp(c: Context): string | null {
  return (
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    null
  );
}

/** Bounded in-memory sliding-window IP rate limiter for public intake and sensitive endpoints. */
export function rateLimit(options: { limit: number; windowMs: number; keyPrefix: string }) {
  return factory.createMiddleware(async (c, next) => {
    const now = Date.now();
    const ip = clientIp(c) ?? 'anon';
    const key = `${options.keyPrefix}:${ip}`;
    const existing = rateLimitBuckets.get(key);

    if (!existing || existing.resetAt <= now) {
      if (rateLimitBuckets.size >= MAX_RATE_LIMIT_BUCKETS) {
        const oldestKey = rateLimitBuckets.keys().next().value;
        if (oldestKey) rateLimitBuckets.delete(oldestKey);
      }
      rateLimitBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
    } else if (existing.count >= options.limit) {
      throw rateLimited('Too many requests. Please wait and try again.');
    } else {
      existing.count += 1;
    }

    await next();
  });
}

/** Enforces an active admin session without requiring a specific domain permission. */
export function requireAdminSession() {
  return factory.createMiddleware(async (c, next) => {
    const admin = await requireAdmin(c.req.raw);
    c.set('admin', admin);
    await next();
  });
}

/** Enforces admin authentication and colon-delimited permission before handler execution. */
export function requireAdminPerm(permission: string) {
  return factory.createMiddleware(async (c, next) => {
    const admin = await requirePermission(c.req.raw, permission);
    c.set('admin', admin);
    await next();
  });
}

/** Enforces an active, non-banned buyer session and sets `c.var.buyer`. */
export function requireBuyer() {
  return factory.createMiddleware(async (c, next) => {
    const buyer = await requireBuyerSession(c.req.raw);
    c.set('buyer', buyer);
    await next();
  });
}

/** Parses and validates a JSON request body with Zod (422 on invalid JSON or schema failure). */
export async function parseJson<T>(c: Context<AppEnv>, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw invalid('Request body must be valid JSON.');
  }
  return schema.parse(raw);
}

/** Parses and validates URL search query parameters with Zod. */
export function parseQuery<T>(c: Context<AppEnv>, schema: ZodType<T>): T {
  const url = new URL(c.req.url);
  return schema.parse(Object.fromEntries(url.searchParams.entries()));
}

/** Wraps admin/buyer responses in `{ data }` with `Cache-Control: private, no-store`. */
export function adminJson<T>(c: Context<AppEnv>, data: T, status: 200 | 201 = 200) {
  return c.json({ data }, status, { 'Cache-Control': 'private, no-store' });
}

export interface RouteAuditEntry {
  action: string;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  target?: string | null;
  summary: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}

async function writeRouteAudit(
  c: Context<AppEnv>,
  actorType: 'user' | 'buyer',
  actorId: string | null,
  entry: RouteAuditEntry,
): Promise<void> {
  await recordAudit({
    actorId,
    actorType,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    target: entry.target ?? null,
    summary: entry.summary,
    beforeState: entry.beforeState ?? null,
    afterState: entry.afterState ?? null,
    ipAddress: clientIp(c),
    userAgent: c.req.header('user-agent') ?? null,
  });
}

/** Records an admin mutation in `audit_log` with the authenticated actor and request metadata. */
export async function auditAdmin(c: Context<AppEnv>, entry: RouteAuditEntry): Promise<void> {
  await writeRouteAudit(c, 'user', c.var.admin?.id ?? null, entry);
}

/** Records a buyer mutation in `audit_log` with the authenticated buyer and request metadata. */
export async function auditBuyer(
  c: Context<AppEnv>,
  buyerId: string,
  entry: RouteAuditEntry,
): Promise<void> {
  await writeRouteAudit(c, 'buyer', buyerId, entry);
}
