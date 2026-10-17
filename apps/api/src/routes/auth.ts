import { Hono } from 'hono';
import { auth } from '@/lib/auth';
import type { AppEnv } from '@/server/factory';

/** Delegates `/api/auth/*` requests (OAuth sign-in, callback, session, sign-out) to Better Auth. */
export const authRoutes = new Hono<AppEnv>().on(['GET', 'POST'], '/*', (c) =>
  auth.handler(c.req.raw),
);
