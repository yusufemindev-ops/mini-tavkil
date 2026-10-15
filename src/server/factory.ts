import type { Context } from 'hono';
import { createFactory } from 'hono/factory';
import type { ZodType } from 'zod';
import { requirePermission, type AdminUser } from '@/lib/auth-guard';
import { invalid } from '@/lib/api/errors';

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
  };
};

export const factory = createFactory<AppEnv>();

/** Enforces admin authentication and colon-delimited permission before handler execution. */
export function requireAdminPerm(permission: string) {
  return factory.createMiddleware(async (c, next) => {
    const admin = await requirePermission(c.req.raw, permission);
    c.set('admin', admin);
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

/** Wraps admin responses in `{ data }` with `Cache-Control: private, no-store`. */
export function adminJson<T>(c: Context<AppEnv>, data: T, status: 200 | 201 = 200) {
  return c.json({ data }, status, { 'Cache-Control': 'private, no-store' });
}
