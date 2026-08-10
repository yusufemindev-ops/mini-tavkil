import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 keeps connection URLs here, not in schema.prisma.
//
// The URL here is used by the Prisma CLI only — migrate, studio, seed. It must be
// DIRECT_URL: migrations need a direct connection, not the HTTP pooler.
//
// The RUNTIME never reads this file. It connects through the Neon driver adapter in
// src/lib/db.ts using DATABASE_URL (pooled, HTTP), which lets Neon compute autosuspend
// so the free tier's CU-hours last.
//
// One database, no dev/test branch — see CLAUDE.md §7. `migrate deploy` here is a
// considered act; there is no staging to catch a mistake.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DIRECT_URL'),
  },
  migrations: {
    seed: 'tsx scripts/seed.ts',
  },
});
