import { count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories, products } from '@/lib/db/schema';

// Smoke test: proves Drizzle + Neon HTTP runs on Workers against the real schema,
// and forces the DB layer into the bundle so `wrangler deploy --dry-run` reports a
// truthful size against the 3 MB free-plan limit.
// Keep this route — it doubles as an uptime check.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [cat] = await db.select({ n: count() }).from(categories);
    const [prod] = await db.select({ n: count() }).from(products);
    return Response.json({ ok: true, categories: cat.n, products: prod.n });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'unknown' },
      { status: 500 },
    );
  }
}
