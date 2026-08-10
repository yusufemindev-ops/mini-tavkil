# CLAUDE.md — mini-tavkil

> Read this first in every session. Source of truth for conventions and what NOT to do.

---

## What this is

**mini-tavkil is the successor to Tavkil**, not a side project. It takes the
`tavkil.com` domain and brand; the `tavkil` repo is retired once this ships.
The name is only because the folder `~/Documents/tavkil` was taken.

A **public product showcase** with a **small admin dashboard**. Buyers never sign in.
Prices are never public. Orders happen by contacting us.

Built from Tavkil's own UI code, re-platformed onto one Next.js app on Neon +
Cloudflare.

## Reading order

1. This file
2. `PLAN.md` — decisions + the numbered steps to finish the project
3. `TESTING.md` — Vitest + Playwright + Chrome DevTools MCP
4. `README.md` — setup + commands
5. Tavkil docs at `~/Documents/foundation-pm/Tavkil/` — PRD, architecture, db-schema

Source repos to port from: `~/Documents/tavkil` (UI + services + schema),
`~/Documents/temsan` (Cloudflare/Neon patterns only — never its schema or admin).

---

## ⚠️ HARD RULES

### 1. Public responses contain no price and no supplier

Both are internal admin-only. They never appear in any anonymous response, sitemap,
`robots.txt`, `llms.txt`, `llms-full.txt`, JSON-LD, or error `details`.

**Enforcement is one function.** `lib/queries/public-product.ts` exports the only
shape public pages may render, and that shape has no `price` and no `supplier` field
at all. A leak becomes a **type error**, not a code-review catch.

- Never select price or supplier columns in a query reachable from a public page
- Never widen the public return type "just for this one page"
- If a public page needs a new field, add it to the public shape deliberately

This replaces Tavkil's three-DTO discipline. Do not reintroduce `PublicProductDto` /
`BuyerProductDto` / `AdminProductDto` — there is no buyer tier here.

### 2. Cloudflare Workers constraints — know what cannot run

| Doesn't work                          | Use instead                                                      |
| ------------------------------------- | ---------------------------------------------------------------- |
| Sharp / native image libs             | Browser-side canvas → WebP before upload (`lib/image-resize.ts`) |
| Long-lived background processes       | **Cron Triggers** in `wrangler.jsonc`                            |
| `onApplicationBootstrap` / boot hooks | A script run on deploy (`pnpm sync:permissions`)                 |
| Node TCP database drivers             | `@neondatabase/serverless` over **HTTP**                         |
| Anything pushing the bundle over 3 MB | Free plan limit; check after adding deps                         |

**Drizzle, not Prisma — and this is measured, not preference.** Prisma 7 does run on
Workers, but its client cost **1.85 MB gzipped**, putting the empty scaffold at 2.79 MB
of the 3 MB free-plan limit before a single feature existed. Drizzle's whole DB layer
costs **~88 KB**: the same scaffold measures **1.02 MB**.

**Never migrate back to Prisma.** It means paying Cloudflare $5/month for headroom you
currently get for free.

### 3. Neon: HTTP mode, always

`DATABASE_URL` is the **pooled HTTP** connection so compute autosuspends and the free
100 CU-hours last. WebSocket keeps compute awake and burns them.

Consequence: **no interactive transactions** on a request path. `neon-http` supports
batching only:

```ts
await db.batch([q1, q2]); //  OK
await db.transaction(async (tx) => …); //  NOT on a request path
```

If you genuinely need an interactive transaction, it belongs in a script using
`DIRECT_URL` over TCP, not in a route handler.

### 4. SEO is not simplified — it's the one area we exceed Tavkil

- Public pages: **Server Components + native `fetch`**. Never TanStack Query on an
  indexable page.
- Every public page emits full metadata: canonical, hreflang for all 3 locales, OG, JSON-LD
- `Product` JSON-LD **without `offers`** — we have no public price, and faking one is spam
- `BreadcrumbList` on product + category pages
- **Sitemap `lastModified` comes from the row's `updated_at`** — never `new Date()`.
  Wrong `lastModified` makes Google crawl you _slower_.
- IndexNow ping on publish
- Every product reachable in ~3 clicks from the homepage

### 5. Simplify machinery, never capability

When a Tavkil feature is more machinery than this project needs, cut the machinery.
Prefer deleting UI over deleting data models. Prefer fixed-in-code config over runtime
editors. See `PLAN.md` §3 for what this already decided (role editor, settings, audit).

### 6. Permission notation: colon, never dot

`products:edit`, `categories:view`, `users:assign_role`. Roles are **fixed in code**
in `permissions/catalog.ts` — there is no role editor UI.

### 7. Single environment, single branch

**One git branch: `main`.** No `develop`. (Tavkil's develop-base rule does not apply here.)
**One Neon database.** No dev/test branch. **One R2 bucket.** No preview bucket.

Local dev talks to the same database and bucket production does. That's deliberate —
nothing to keep in sync, and what you test is what ships. The cost is that carelessness
has real consequences:

- Tests create only `e2e-` prefixed rows and delete them in teardown, pass or fail
- Never `deleteMany({})` or any broad-filter delete
- `drizzle-kit migrate` is a considered act — there is no staging to catch a mistake
- Always check what a destructive command targets before running it

### 8. Migrations are never automatic

`drizzle-kit migrate` is a deliberate step. Workers have no boot; nothing runs
migrations for you, and nothing should.

---

## Stack

| Layer   | Choice                                                                 |
| ------- | ---------------------------------------------------------------------- |
| App     | Next.js 16 App Router — storefront + `/api` + `/admin`, one deployable |
| DB      | Neon Postgres + **Drizzle** (`@neondatabase/serverless`, HTTP)         |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare`                        |
| Storage | Cloudflare R2 (Worker binding — no S3 credentials)                     |
| Auth    | Better Auth + Google, **admin only**, `ADMIN_ALLOWLIST`                |
| Email   | TBD — Cloudflare Email Service. **Postmark dropped** 2026-08-10        |
| Captcha | Cloudflare Turnstile, on the contact form                              |
| UI      | shadcn/ui + Tailwind v4 + @base-ui/react + lucide-react                |
| i18n    | next-intl — EN / TR / AR, localized slugs                              |
| Admin   | Tavkil's Vite SPA, built and served under `/admin`                     |
| Tests   | Vitest + Playwright + Chrome DevTools MCP — see `TESTING.md`           |

---

## Definition of done

- [ ] Route handler + service function + Drizzle query
- [ ] Public data goes through `publicProduct()` — no price, no supplier
- [ ] Frontend: page/component + RHF + zod + i18n keys (all 3 locales) + a11y
- [ ] Vitest unit test where logic is non-trivial; Playwright flow if user-facing
- [ ] If public: metadata + JSON-LD + sitemap entry with real `lastModified`
- [ ] Permission checked in the handler
- [ ] No new interactive transactions on a request path
- [ ] Bundle still under the Workers limit
- [ ] Conventional commit

---

## Never do

- Put a price or supplier in anything a logged-out visitor can reach
- Migrate back to Prisma — it costs 1.85 MB of a 3 MB budget
- Use WebSocket/pooled-TCP Neon mode on a request path
- Use TanStack Query on a public indexable page
- `lastModified: new Date()` in the sitemap
- Hardcode user-visible strings — they come from `messages/{locale}.json`
- Write inline SVGs — use `lucide-react`
- Hand-edit generated files in `drizzle/` — let `drizzle-kit generate` produce them
- Run migrations or permission-sync on boot
- Copy anything from Temsan's schema or admin — architecture patterns only
- `--no-verify`
