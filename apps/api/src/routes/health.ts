import { Hono } from 'hono';
import { count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories, products } from '@/lib/db/schema';
import type { AppEnv } from '@/server/factory';

/** Health check endpoint verifying Drizzle + Neon HTTP database connectivity. */
export const healthRoutes = new Hono<AppEnv>().get('/', async (c) => {
  try {
    const [cat] = await db.select({ n: count() }).from(categories);
    const [prod] = await db.select({ n: count() }).from(products);
    return c.json({ ok: true, categories: cat.n, products: prod.n });
  } catch (error) {
    console.error('Healthcheck failed:', error);
    return c.json({ ok: false, error: 'Database unavailable' }, 500);
  }
});
