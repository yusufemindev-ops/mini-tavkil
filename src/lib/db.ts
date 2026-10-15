import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/lib/db/schema';
import * as relations from '@/lib/db/relations';

// Drizzle over the pooled Neon HTTP driver (supports `db.batch([...])` on request paths).
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
