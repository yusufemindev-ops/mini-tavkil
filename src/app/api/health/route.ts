import { prisma } from '@/lib/db';

// Block-0 smoke test: proves Prisma 7 + @prisma/adapter-neon actually runs on
// Workers with our 32-model schema, and forces the client into the bundle so
// `wrangler deploy` reports a truthful size against the 3 MB limit.
// Keep this route — it doubles as an uptime check.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [categories, products] = await Promise.all([
      prisma.category.count(),
      prisma.product.count(),
    ]);
    return Response.json({ ok: true, categories, products });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : 'unknown' },
      { status: 500 },
    );
  }
}
