import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/lib/db/schema';
import * as relations from '@/lib/db/relations';

// Drizzle over the Neon HTTP driver.
//
// Chosen over Prisma for bundle size: Prisma's client cost 1.85 MB gzipped, which
// alone would have pushed us past Cloudflare's 3 MB free-plan limit. Drizzle adds
// roughly 50-100 KB. See PLAN.md §2.
//
// DATABASE_URL must be the POOLED (-pooler) Neon URL. HTTP lets Neon compute
// autosuspend between requests, which is what keeps the free tier's 100 CU-hours
// viable. WebSocket mode holds compute awake and burns them.
//
// Consequence: no interactive transactions on request paths. neon-http supports
// batched transactions only:
//   OK    db.batch([q1, q2])
//   NOT   db.transaction(async (tx) => …)   <- use a script with DIRECT_URL
export function createDb(connectionString: string) {
  return drizzle(neon(connectionString), {
    schema: { ...schema, ...relations },
    casing: 'snake_case',
  });
}

type Database = ReturnType<typeof createDb>;

let instance: Database | undefined;

/**
 * The request-path client, created on first use rather than at import.
 *
 * Lazy on purpose. Reading DATABASE_URL at module scope meant `import { db }`
 * threw during import, so a unit test that touched none of this failed at load —
 * which happened four separate times while porting the services, each time
 * needing a module to be split apart. It also matters for the cron handler:
 * `scheduled()` runs outside Next's request context, where OpenNext has not
 * populated process.env, so the eager read would have thrown there too.
 *
 * The Proxy keeps every call site as `db.select()…` with no ceremony.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, property, receiver) {
    if (!instance) {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) throw new Error('DATABASE_URL is not set');
      instance = createDb(connectionString);
    }
    return Reflect.get(instance, property, receiver);
  },
});

export { schema };
