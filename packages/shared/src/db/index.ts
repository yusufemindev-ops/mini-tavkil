import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as relations from './relations';

// Drizzle over the pooled Neon HTTP driver (supports `db.batch([...])` on request paths).
export function createDb(connectionString: string) {
  return drizzle(neon(connectionString), {
    schema: { ...schema, ...relations },
    casing: 'snake_case',
  });
}

export type Database = ReturnType<typeof createDb>;

let instance: Database | undefined;

// Lazy proxy client initialized on first query so importing `db` never throws at module load.
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
