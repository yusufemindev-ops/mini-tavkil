---
name: cloudflare-constraints
description: Enforces Cloudflare Workers runtime constraints (128 MB isolate RAM limit, Neon HTTP pooled connections, db.batch instead of interactive transactions, browser-side WebP resizing, R2 bindings, and Cron Triggers). Use when adding dependencies, writing database queries, handling file uploads, or scheduling background tasks.
---

# Skill: cloudflare-constraints

What does not work on Cloudflare Workers, and what to do instead. Check this before adding any dependency, query, or background behaviour.

## The mental model

A Worker is **not a traditional long-running Node server**. It has no boot hook, no persistent background process, no local filesystem, no native C/C++ addons, and a strict **128 MB RAM limit per isolate**. Everything the legacy Nest.js backend did "on startup" or "in the background" has an edge-native equivalent here.

## Platform replacements

| Doesn't work                         | Use instead                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| Sharp, `canvas`, native image libs   | Resize in the **admin browser** before upload (`admin/src/lib/image-resize.ts` → WebP) |
| `setInterval` / background loops     | **Cron Triggers** in `wrangler.jsonc` + `scheduled()` in `worker.ts` + `ctx.waitUntil` |
| `onApplicationBootstrap`, boot hooks | Explicit CLI/deploy scripts (`pnpm sync:permissions`)                                  |
| `pg` TCP drivers on request paths    | `@neondatabase/serverless` (pooled HTTP) + Drizzle ORM                                 |
| Interactive `db.transaction()`       | `db.batch([...])` on request paths, or a CLI script using `DIRECT_URL` over TCP        |
| Unbounded `SELECT *` queries         | Strict pagination (`LIMIT`), cursor/offset, and lean column projections (< 128 MB RAM) |
| Local filesystem writes (`uploads/`) | Cloudflare R2 (`IMAGES_BUCKET` binding)                                                |

## Drizzle, not Prisma

```ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
export const db = drizzle(neon(process.env.DATABASE_URL!), { schema, casing: 'snake_case' });
```

Prisma 7 was evaluated and rejected on bundle size:

| Scaffold, no features | gzipped |
| --------------------- | ------- |
| Next.js alone         | 0.94 MB |
| + Prisma client       | 2.79 MB |
| + Drizzle             | 1.02 MB |

Prisma's client alone adds 1.85 MB gzipped, whereas Drizzle's entire DB layer adds ~88 KB. **Never migrate back to Prisma.**

The schema in `src/lib/db/schema.ts` is managed with Drizzle. Note: Postgres `citext` is custom-defined in `src/lib/db/citext.ts` because `drizzle-kit pull` introspection maps it to `unknown("col")`. If you ever run `drizzle-kit pull`, replace any `unknown(...)` column with `citext(...)`.

## Neon connection model

- **Runtime (`DATABASE_URL`):** Pooled HTTP connection (`-pooler` host). Zero TCP handshake overhead per Worker invocation and allows Neon compute to autosuspend when idle.
- **CLI / Migrations (`DIRECT_URL`):** Direct TCP connection, used only by `drizzle-kit`, `scripts/`, and integration test setup/teardown.

## 128 MB RAM Isolate Limit

Every Cloudflare Worker isolate (both Free and Paid plans) has a hard **128 MB memory cap**. Exceeding it immediately terminates the Worker with an unrecoverable Out-Of-Memory error:

- Always paginate catalog and admin queries (`LIMIT`).
- Project only required columns on list endpoints.
- Stream large exports (e.g. CSVs) rather than buffering full datasets in memory.

## Cron Triggers & Background Work

```jsonc
// wrangler.jsonc
"triggers": { "crons": ["0 6 * * *"] }
```

```ts
// worker.ts
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshFxRates(env));
  },
};
```

For request-triggered side effects (sending transactional emails, IndexNow pings), use `ctx.waitUntil()` so the HTTP response returns immediately without blocking the caller.

## Before adding a dependency

1. Does it use native C/C++ modules or Node built-ins outside `nodejs_compat`? → Reject.
2. Does it require a persistent TCP socket or background thread? → Reject.
3. How much does it add to the Worker bundle (`.github/workflows/worker-bundle-size.yml`)? → Measure before merging.
4. Could this run in the browser instead (like Canvas image resizing)? → Prefer client-side when appropriate.
