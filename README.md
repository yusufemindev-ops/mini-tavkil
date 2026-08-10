| `.env.example` | 14 env keys, with `[carry]` markers for values reusable from Tavkil || `pnpm db:studio` | Drizzle Studio |
| `pnpm db:pull` | Re-introspect Neon into src/lib/db/schema.ts |
| `pnpm db:generate` | Generate a migration from schema changes |# mini-tavkil

Successor to [Tavkil](https://tavkil.com) — a public product showcase with a small
admin dashboard. One Next.js app on Neon + Cloudflare.

Buyers never sign in. Prices are never public. Orders start with a contact form.

---

## Docs

| File             | What's in it                                                        |
| ---------------- | ------------------------------------------------------------------- |
| **`CLAUDE.md`**  | Hard rules, stack, definition of done. Read first.                  |
| **`PLAN.md`**    | Every decision and why — what was cut from Tavkil and what stayed   |
| **`DAY-1.md`**   | The build runbook, 8 blocks, ~10.75 hours                           |
| **`TESTING.md`** | Vitest + Playwright + Chrome DevTools MCP                           |
| `.env.example`   | 16 env keys, with `[carry]` markers for values reusable from Tavkil |

Design docs live at `~/Documents/foundation-pm/Tavkil/`.

---

## Layout

```
app/
  [locale]/          public storefront — Server Components, no client data fetching
  admin/             Vite SPA build output, served as static assets
  api/               route handlers (replaces the Nest.js backend)
lib/
  db/                generated Drizzle schema + relations + citext type
  queries/           Drizzle access. public-product.ts is the leak-proof shape.
  services/          ported Nest services, minus the decorators
  image-resize.ts    browser-side canvas → WebP (Sharp can't run on Workers)
  seo/               metadata, JSON-LD, sitemap helpers
drizzle/             generated SQL baseline + drizzle-kit metadata
messages/            en.json · tr.json · ar.json
e2e/                 Playwright
scripts/             sync-permissions, seed, fx-refresh
wrangler.jsonc       R2 bindings, Cron Triggers, env
```

---

## Setup

```bash
pnpm install
cp .env.example .env          # fill in; [carry] values come from tavkil/.env
cp .env .dev.vars             # wrangler reads this for local Cloudflare runs

pnpm db:migrate               # drizzle-kit, uses DIRECT_URL
pnpm seed
pnpm sync:permissions         # fills the Permission table — no boot hook exists

pnpm dev                      # Next dev server
pnpm preview                  # Workers runtime locally, via wrangler
```

**Neon:** create the project, then take two connection strings — the **pooled** one
(`-pooler` in the host) for `DATABASE_URL`, and the direct one for `DIRECT_URL`.
Pooled HTTP is what lets compute autosuspend and keeps the free tier free.

**Cloudflare:** create the R2 bucket, bind it in `wrangler.jsonc`. There are no S3
credentials — the binding replaces them.

**Google OAuth:** add `https://tavkil.com/api/auth/callback/google` and
`http://localhost:3000/api/auth/callback/google` as redirect URIs. Reuse Tavkil's
client; it's the same domain.

---

## Commands

| Command                 | Does                                            |
| ----------------------- | ----------------------------------------------- |
| `pnpm dev`              | Next dev server                                 |
| `pnpm preview`          | Run against the real Workers runtime locally    |
| `pnpm deploy`           | Build + `wrangler deploy`                       |
| `pnpm test`             | Vitest, once                                    |
| `pnpm test:watch`       | Vitest, watch                                   |
| `pnpm e2e`              | Playwright                                      |
| `pnpm e2e:report`       | Open the last Playwright report                 |
| `pnpm db:studio`        | Prisma Studio                                   |
| `pnpm seed`             | Seed catalog data                               |
| `pnpm sync:permissions` | Sync `Permission` table from `catalog.ts`       |
| `pnpm fx:refresh`       | Fetch USD→TRY now (also runs on a Cron Trigger) |

---

## Things that will surprise you

- **Sharp is not available.** Images are resized in the browser before upload.
- **Nothing runs on boot.** Workers start per request. Permission sync and FX are a
  script and a Cron Trigger.
- **No interactive transactions** on request paths — Neon HTTP mode does not support
  them. `db.batch([q1, q2])` is fine.
- **Bundle size is a hard gate.** Cloudflare free plan caps at 3 MB gzipped. The
  scaffold measures 1.02 MB. Prisma was rejected because its client alone cost 1.85 MB.
- **The admin is still a Vite SPA.** It's built and served as static assets under
  `/admin`; it was never ported to Next.js routes, and probably shouldn't be.
