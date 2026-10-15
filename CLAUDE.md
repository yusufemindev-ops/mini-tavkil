# CLAUDE.md — mini-tavkil (Tavkil B2B Wholesale Platform)

> Read this first in every session. Source of truth for conventions, architecture, and what NOT to do.

---

## What this is

**mini-tavkil is the production Tavkil codebase** (`tavkil.com`). The initial foundation is already deployed. We are actively expanding this repository to full feature parity with the original `tavkil` codebase (buyer authentication, personalized tier pricing, RFQ/order request lifecycle, custom RBAC roles, and audit logging), while executing the target architecture defined in `ARCHITECTURE.md`:

- **Two separate frontends:** Customer Storefront (Next.js 16 SSR/ISR) and Vendor/Admin Panel (React 19 + Vite standalone SPA).
- **Backend API on Cloudflare Workers:** Transitioning from the initial Next.js `/api` route handlers to a dedicated, high-performance **Hono** backend API running on Cloudflare Workers, connecting to Neon Serverless Postgres via Cloudflare Hyperdrive connection pooling.

The repo folder is named `mini-tavkil` only because `~/Documents/tavkil` holds the legacy Nest.js/Prisma reference codebase we are porting features from. **At the end, after we finish and reach full feature parity, we will rename `mini-tavkil` to `tavkil` and delete the old `tavkil` folder.**

## Reading order

1. This file (`CLAUDE.md`) & `AGENTS.md`
2. `ARCHITECTURE.md` — locked target architecture (Hono API, Cloudflare Hyperdrive, 2 frontends, 128 MB RAM constraints)
3. `TESTING.md` — Vitest + Playwright + Chrome DevTools MCP
4. `README.md` — setup + commands
5. Reference repos & design docs:
   - `~/Documents/tavkil` — source repo to port remaining business features, UI screens, and services from
   - `~/Documents/foundation-pm/Tavkil/` — PRD, architecture, db-schema, API contract, error codes, prototypes
   - `~/Documents/temsan` — Cloudflare/Neon infrastructure patterns only (never copy its schema or admin)

---

## ⚠️ HARD RULES

### 1. Pricing & supplier visibility (3-audience model)

Three layers of audience, three strict views of data. Any leak across audience boundaries is a Critical Severity defect:

- **Public (anonymous storefront):** Zero prices (`base_price`, `tier_markup_percent`, `unit_price`) and zero supplier identities in any anonymous response, sitemap, `robots.txt`, `llms.txt`, `llms-full.txt`, JSON-LD (`Product` rendered without `offers`), RSC payload, or error `details`.
  - **Enforced at the query boundary:** `src/lib/queries/public-product.ts` exports the only product shape anonymous pages may render, containing no price or supplier fields.
- **Buyer (authenticated storefront):** Sees only the server-computed personalized `unitPrice` (`base_price × (1 + tier_markup_percent / 100)`). Raw `base_price` and `tier_markup_percent` must **never** be exposed to buyer responses or serialized into client HTML.
- **Admin (`/api/admin/*`):** Full visibility (`base_price`, `tier_markup_percent`, supplier identities, internal notes), strictly gated behind admin session + permission checks.

### 2. Cloudflare Workers constraints — know what cannot run

| Doesn't work                          | Use instead                                                                |
| ------------------------------------- | -------------------------------------------------------------------------- |
| Sharp / native image libs             | Browser-side canvas → WebP before upload (`admin/src/lib/image-resize.ts`) |
| Long-lived background processes       | **Cron Triggers** in `wrangler.jsonc` + `ctx.waitUntil()`                  |
| `onApplicationBootstrap` / boot hooks | A script run on deploy (`pnpm sync:permissions`)                           |
| Node TCP database drivers             | `@neondatabase/serverless` over **HTTP**                                   |
| Unbounded queries (> 128 MB isolate)  | Strict pagination (`LIMIT`), lean column projections, streaming            |

**Drizzle, not Prisma — measured, not preference.** Prisma's client costs 1.85 MB gzipped on Workers, whereas Drizzle's DB layer costs ~88 KB. **Never migrate back to Prisma.**

### 3. Neon: HTTP mode, always

`DATABASE_URL` is the **pooled HTTP** connection so compute autosuspends cleanly. WebSocket connections keep compute awake.

Consequence: **no interactive transactions** on a request path. `neon-http` supports batching only:

```ts
await db.batch([q1, q2]); // OK on request paths
await db.transaction(async (tx) => …); // NOT supported on neon-http request paths
```

If you genuinely need an interactive transaction, it belongs in a CLI script using `DIRECT_URL` over TCP, not in a route handler.

### 4. SEO/GEO/AEO Knowledge Engine principle

- **Public indexable pages:** Next.js **Server Components + direct query / native `fetch`**. Never use TanStack Query on a public, indexable page.
- **Authenticated buyer pages & Admin SPA:** TanStack Query is used for dynamic per-user state on buyer routes (`/account`, `/cart`, `/orders`) and in the separate Admin SPA (`admin/`).
- Every public page emits full metadata: canonical, `hreflang` for all 3 locales (`en`, `tr`, `ar`) + `x-default`, OG tags, and JSON-LD.
- `Product` JSON-LD **without `offers`** — anonymous pages have no public price, and faking one is spam.
- `BreadcrumbList` on product + category pages.
- **Sitemap `lastModified` comes from the row's `updated_at`** — never `new Date()`.
- IndexNow ping on product/category publish.
- Every product reachable in ~3 clicks from the homepage.

### 5. Permission notation & Admin Route Wrapper

- Always use `domain:action` with a colon: `orders:confirm`, `products:edit`, `categories:view`, `users:assign_role`. Never use dot notation (`orders.confirm`).
- Every `/api/admin/*` route handler must wrap its handler with `adminRoute(permission, [schema], handler)` from `src/lib/api/handler.ts` (authenticates and checks permission first, parses Zod body, and wraps responses in `{ data }` with `Cache-Control: private, no-store`).
- Keep validation schemas (`*-schema.ts`, `*-schemas.ts`) and `publish-gates.ts` free of `@/lib/db` imports (`import-boundary.test.ts` enforces this so unit tests run without a database).

### 6. Branching & Environments

- **Git flow:** `feat/TSC-XXX-*` → `develop` (via PR) → `main` (production release via PR). Direct pushes to `main` and `develop` are blocked by hooks and CI branch-guards.
- **Commit format:** Conventional commit with ticket: `<type>: [TSC-XXX] <description>` (e.g. `feat: [TSC-70] add CI workflows`). Allowed types: `feat`, `fix`, `chore`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`. Max 72 characters, single-line, no body.
- **Package manager:** Use `pnpm` exclusively (`pnpm install`, `pnpm add`). Never use `npm` or `yarn`.
- **Neon database:** `main` (production) and `dev` (isolated development & schema migration testing).
- **R2 Storage:** Production bucket + `preview_bucket_name` for local/staging isolation.
- Tests create only `e2e-` prefixed rows and clean them up in teardown. Never `deleteMany({})` or run broad-filter deletes.
- **Migrations are never automatic:** `drizzle-kit migrate` is run deliberately against `dev` first, verified, then `main`.
- **Security contact:** `yusufemin.dev@gmail.com` (critical leaks or vulnerabilities).

### 7. Code comments: concise and minimal (no long essays or lore)

- **Max 1–2 concise lines:** Only comment when necessary. Prefer self-documenting code.
- **No essays, historical lore, or migration stories:** Never write comments detailing past bugs, historical comparisons ("Tavkil used to do X..."), internal discussions, or references to old plan steps.
- **No obvious comments:** Do not explain what clean code already says.
- **Explain non-obvious "why" only:** Document subtle security constraints, edge cases, or platform quirks briefly.

---

## Local Verification Commands

Run before opening a PR or claiming work is complete:

```bash
# Code Quality & Formatting
pnpm lint               # Storefront & API Next.js linting
pnpm admin:lint         # Admin Vite SPA linting
pnpm format:check       # Prettier formatting & Tailwind class sorting

# Type Safety
pnpm typecheck          # Next.js route typegen & tsc
pnpm admin:typecheck    # Admin SPA tsc

# Tests & Security Checks
pnpm test               # Unit & component test suite (Vitest)
pnpm check:i18n         # Locale key parity (en / tr / ar)
pnpm check:pricing-leak # Secret price & supplier guard
```

---

## Stack

| Layer      | Choice                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------- |
| Storefront | Next.js 16 App Router (B2B customer storefront — SSR/ISR public catalog + buyer portal)     |
| Admin      | React 19 + Vite SPA (`admin/` — standalone operator dashboard frontend)                     |
| API / Edge | **Hono on Cloudflare Workers** (Edge API orchestrator replacing transitional Next.js API)   |
| DB         | **Neon Serverless Postgres + Drizzle ORM** via **Cloudflare Hyperdrive** connection pool    |
| Storage    | Cloudflare R2 (Worker bindings — zero egress, no S3 credentials)                            |
| Auth       | Better Auth + Google OAuth (Admins + admin-provisioned Buyers; no buyer self-signup)        |
| Email      | Cloudflare Email Service / transactional notifications via Worker                           |
| Captcha    | Cloudflare Turnstile (Account Request & Contact forms)                                      |
| UI         | shadcn/ui + Tailwind v4 + `@base-ui/react` + `lucide-react` + IBM Plex Sans / Arabic / Mono |
| i18n       | `next-intl` — EN / TR / AR (RTL), localized slugs                                           |
| Tests      | Vitest + Playwright + Chrome DevTools MCP — see `TESTING.md`                                |

---

## Definition of done

- [ ] Route handler + service function + Drizzle query
- [ ] Audience data boundary respected: `publicProduct()` for anonymous, computed `unitPrice` only for buyers, `base_price` / `tier_markup_percent` / supplier details restricted to admin
- [ ] Frontend: page/component + RHF + zod + i18n keys (all 3 locales: `en`, `tr`, `ar`) + RTL logical CSS properties + a11y
- [ ] Vitest unit/integration test where logic is non-trivial; Playwright flow if user-facing
- [ ] If public: metadata + JSON-LD (no `offers` on `Product`) + sitemap entry with real `updated_at`
- [ ] Permission checked on entry in `/api/admin/*` handlers (`domain:action`)
- [ ] Audit log entry written on state-changing admin/buyer actions (once audit module is wired)
- [ ] No interactive transactions on a request path (`db.batch` only) and queries bounded for the 128 MB Worker RAM limit
- [ ] Conventional commit with ticket: `<type>: [TSC-XXX] <description>` (<= 72 chars)
- [ ] All verification commands passing locally

---

## Never do

- Expose `base_price` or `tier_markup_percent` to any public or buyer surface, or expose any price/supplier to anonymous visitors
- Migrate back to Prisma
- Use WebSocket/TCP Neon connections or interactive `db.transaction()` on a Worker request path
- Run unbounded `SELECT` queries without `LIMIT` on Cloudflare Workers (128 MB RAM limit)
- Use TanStack Query on a public indexable page
- Use `lastModified: new Date()` in the sitemap
- Hardcode user-visible strings — they must come from `messages/{locale}.json`
- Write inline SVGs — use `lucide-react` (or shared brand icons in `src/components/icons.tsx`)
- Hand-edit generated files in `drizzle/` — let `drizzle-kit generate` produce them
- Run migrations or permission-sync automatically on boot
- Copy anything from Temsan's schema or admin — architecture patterns only
- Write essay-length comments, development journals, or historical migration lore in code
- Write multi-line narrative commit messages or commit lines exceeding 72 characters
- Run `git commit` or `git push` without asking the user and receiving explicit permission first
- Use `--no-verify` to bypass git hooks

<!-- markdownlint-disable MD025 -->
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
