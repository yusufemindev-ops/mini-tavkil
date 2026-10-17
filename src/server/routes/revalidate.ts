import { Hono } from 'hono';
import { z } from 'zod';
import { AuthError } from '@/lib/api/errors';
import { revalidateLocal } from '@/lib/cache';
import { parseJson, type AppEnv } from '@/server/factory';

const revalidateSchema = z.object({
  path: z.string().min(1),
  type: z.enum(['page', 'layout']).optional(),
});

/** Internal ISR cache invalidation endpoint invoked by the standalone API Worker on mutations. */
export const internalRevalidateRoutes = new Hono<AppEnv>().post('/', async (c) => {
  const secret = process.env.BETTER_AUTH_SECRET;
  const provided = c.req.header('x-revalidate-secret');
  if (!secret || !provided || provided !== secret) {
    throw new AuthError(401, 'Unauthorized revalidation request.');
  }
  const { path, type } = await parseJson(c, revalidateSchema);
  revalidateLocal(path, type);
  return c.json({ ok: true });
});
