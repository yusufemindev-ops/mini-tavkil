import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// DIRECT_URL, not DATABASE_URL: drizzle-kit runs from a machine over TCP.
// The runtime uses the pooled HTTP connection — see src/lib/db.ts.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
