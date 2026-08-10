# Skill: cloudflare-constraints

What does not work on Cloudflare Workers, and what to do instead. Check this before
adding any dependency or background behaviour.

## The mental model

A Worker is **not a server**. It has no boot, no long-lived process, no filesystem, no
native modules. It wakes for a request, runs, and dies. Everything Tavkil did "on
startup" or "in the background" needs a different home.

## The table

| Doesn't work                              | Use instead                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| Sharp, `canvas`, native image libs        | Resize in the **browser** before upload — `lib/image-resize.ts`, canvas → WebP |
| `setInterval` / background loops          | **Cron Triggers** in `wrangler.jsonc` + a `scheduled()` handler                |
| `onApplicationBootstrap`, boot hooks      | A script run on deploy — `pnpm sync:permissions`                               |
| `pg`, TCP database drivers                | `@prisma/adapter-neon` over HTTP                                               |
| Interactive `$transaction(async tx => …)` | Array form, or a script using `DIRECT_URL`                                     |
| Filesystem writes                         | R2                                                                             |
| Big WASM / native deps                    | Nothing — the 3 MB free-plan bundle limit is hard                              |

## Prisma specifics

Prisma 7 is Rust-free; Workers is a first-class target. Two requirements:

```prisma
generator client {
  provider = "prisma-client"   // NOT prisma-client-js
  output   = "./generated"
}
```

```ts
import { PrismaNeon } from '@prisma/adapter-neon';
const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```

**Do not rewrite to Drizzle.** It was considered and rejected — Prisma on Neon HTTP has
the same compute cost, and the schema, 35 migrations, and 19 services port unchanged.

## Neon cost model

Free tier is **100 CU-hours/month**, burned by keeping compute _awake_.

- **HTTP** (pooled URL, `-pooler` host) → autosuspends fast → cheap. **Use this.**
- **WebSocket** → persistent connection → keeps compute awake → burns hours

`DATABASE_URL` = pooled HTTP, for runtime. `DIRECT_URL` = direct, for `prisma migrate`
and scripts only.

## Cron Triggers

```jsonc
// wrangler.jsonc
"triggers": { "crons": ["0 6 * * *"] }
```

```ts
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshFxRates(env));
  },
};
```

Current users: FX rate refresh (USD→TRY from Frankfurter, `open.er-api` fallback,
SAR/AED are USD-pegged and never fetched).

## Bundle size — a live budget, measured

Cloudflare free plan: **3 MB gzipped**. Paid: **10 MB**.

**Measured 2026-08-10 on the bare scaffold** (Next.js + Prisma client for 32 models +
one route handler, no features):

```
Total Upload: 10305.67 KiB  /  gzip: 2854.53 KiB   ← 2.79 MB
```

That is **93% of the free limit with no application code**. This project requires
**Workers Paid**. At 10 MB there is roughly 7 MB of headroom — comfortable, but not
infinite, and the Prisma client grows with the schema.

- Run `pnpm exec wrangler deploy --dry-run` before merging anything that adds a dependency
- Treat a size jump as a regression; find the dependency that caused it
- Before adding any library, ask whether it could run in the browser instead
  (this is exactly why image resizing is client-side)

## Before adding a dependency

1. Does it use native modules or Node built-ins beyond `nodejs_compat`? → no
2. Does it need a persistent connection or background thread? → no
3. How much does it add to the bundle? → measure
4. Could this run in the browser instead? → usually the right answer
