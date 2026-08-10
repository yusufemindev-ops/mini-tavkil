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
2. `PLAN.md` — decisions, scope, what was cut and why
3. `DAY-1.md` — the build runbook
4. `TESTING.md` — Vitest + Playwright + Chrome DevTools MCP
5. `README.md` — setup + commands
6. Tavkil docs at `~/Documents/foundation-pm/Tavkil/` — PRD, architecture, db-schema

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

- Never `select: { ... price ... }` in a query reachable from a public page
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
| Node TCP database drivers             | `@prisma/adapter-neon` over **HTTP**                             |
| Anything pushing the bundle over 3 MB | Free plan limit; check after adding deps                         |

**Prisma stays.** Prisma 7 is Rust-free and Workers is a first-class target. Generator
must be `prisma-client` (not `prisma-client-js`), adapter must be
`@prisma/adapter-neon`. **Do not rewrite to Drizzle.**

### 3. Neon: HTTP mode, always

`DATABASE_URL` is the **pooled HTTP** connection so compute autosuspends and the free
100 CU-hours last. WebSocket keeps compute awake and burns them.

Consequence: **no interactive transactions** (`$transaction(async (tx) => …)`) on a
request path. Array form `$transaction([...])` is fine. If you truly need interactive,
it belongs in a script using `DIRECT_URL`, not in a route handler.

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
- `prisma migrate deploy` is a considered act — there is no staging to catch a mistake
- Always check what a destructive command targets before running it

### 8. Migrations are never automatic

`prisma migrate deploy` is a deliberate step. Workers have no boot; nothing runs
migrations for you, and nothing should.

---

## Stack

| Layer   | Choice                                                                 |
| ------- | ---------------------------------------------------------------------- |
| App     | Next.js 16 App Router — storefront + `/api` + `/admin`, one deployable |
| DB      | Neon Postgres + **Prisma 7** (`@prisma/adapter-neon`, HTTP)            |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare`                        |
| Storage | Cloudflare R2 (Worker binding — no S3 credentials)                     |
| Auth    | Better Auth + Google, **admin only**, `ADMIN_ALLOWLIST`                |
| UI      | shadcn/ui + Tailwind v4 + @base-ui/react + lucide-react                |
| i18n    | next-intl — EN / TR / AR, localized slugs                              |
| Admin   | Tavkil's Vite SPA, built and served under `/admin`                     |
| Tests   | Vitest + Playwright + Chrome DevTools MCP — see `TESTING.md`           |

---

## Definition of done

- [ ] Route handler + service function + Prisma query
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
- Rewrite Prisma to Drizzle
- Use WebSocket/pooled-TCP Neon mode on a request path
- Use TanStack Query on a public indexable page
- `lastModified: new Date()` in the sitemap
- Hardcode user-visible strings — they come from `messages/{locale}.json`
- Write inline SVGs — use `lucide-react`
- Hand-edit `prisma/migrations/*.sql`
- Run migrations or permission-sync on boot
- Copy anything from Temsan's schema or admin — architecture patterns only
- `--no-verify`
