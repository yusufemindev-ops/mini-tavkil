import { Hono } from 'hono';
import { listPublicCurrencies } from '@/lib/services/buyer-portal';
import type { AppEnv } from '@/server/factory';

export const publicCurrenciesRoutes = new Hono<AppEnv>().get('/', async (c) => {
  const data = await listPublicCurrencies();
  return c.json({ data }, 200, {
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
  });
});
