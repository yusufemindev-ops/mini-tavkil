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
2. `ARCHITECTURE.md` — target system architecture, Cloudflare specs & 128MB RAM constraints
3. `PLAN.md` — decisions + the numbered steps to finish the project
4. `TESTING.md` — Vitest + Playwright + Chrome DevTools MCP
5. `README.md` — setup + commands
6. Tavkil docs at `~/Documents/foundation-pm/Tavkil/` — PRD, architecture, db-schema

Source repos to port from: `~/Documents/tavkil` (UI + services + schema),
`~/Documents/temsan` (Cloudflare/Neon patterns only — never its schema or admin).

---

## ⚠️ HARD RULES

### 1. Public responses contain no price and no supplier

Both are internal admin-only (`base_price`, `tier_markup_percent`, and supplier identities).
They never appear in any anonymous response, sitemap, `robots.txt`, `llms.txt`, `llms-full.txt`,
JSON-LD, or error `details`. Any leak on a public surface is a Critical Severity defect.

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

### 7. Branching & Environments

- **Git flow:** `feat/TSC-XXX-*` → `develop` (via PR) → `main` (production release via PR).
  Direct pushes to `main` and `develop` are blocked by hooks and CI branch-guards.
- **Commit format:** Conventional commit with ticket: `<type>: [TSC-XXX] <description>` (e.g. `feat: [TSC-70] add CI workflows`). Allowed types: `feat`, `fix`, `chore`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`. Max 72 characters. Never write multi-line narratives or paragraphs in commit messages.
- **Package manager:** Use `pnpm` exclusively (`pnpm install`, `pnpm add`). Never use `npm` or `yarn`.
- **Neon database:** `main` (prod) and `dev` (isolated schema/migration testing).
- **R2 Storage:** Production bucket + `preview_bucket_name` for staging and test uploads.
- Tests create only `e2e-` prefixed rows and clean them up in teardown.
- Never `deleteMany({})` or any broad-filter delete.
- `drizzle-kit migrate` is run deliberately against `dev` first, verified, then `main`.
- **Security contact:** `yusufemin.dev@gmail.com` (critical leaks or vulnerabilities).

### 8. Migrations are never automatic

`drizzle-kit migrate` is a deliberate step. Workers have no boot; nothing runs
migrations for you, and nothing should.

### 9. Code comments: concise and minimal (no long essays or lore)

- **Max 1–2 concise lines:** Only comment when necessary. Prefer self-documenting code.
- **No essays, historical lore, or migration stories:** Never write comments detailing past bugs, historical comparisons ("Tavkil used to do X..."), internal discussions, or references to PRD/PLAN steps unless strictly required for a contract.
- **No obvious comments:** Do not explain what clean code already says (e.g., `// Set name` or `// Render header`).
- **Explain non-obvious "why" only:** Document subtle security constraints, edge cases, or platform quirks briefly.

---

## Local Verification Commands

Run before opening a PR or claiming work is complete:

```bash
# Code Quality & Formatting
pnpm lint            # Storefront Next.js linting
pnpm admin:lint      # Admin Vite SPA linting
pnpm format:check    # Prettier formatting & Tailwind class sorting

# Type Safety
pnpm typecheck       # Next.js route typegen & tsc
pnpm admin:typecheck # Admin SPA tsc

# Tests & Security Checks
pnpm test            # Unit & component test suite (Vitest)
pnpm check:i18n      # Locale key parity (en / tr / ar)
pnpm check:pricing-leak # Secret price & supplier guard
```

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
- [ ] Conventional commit with ticket: `type: [TSC-XXX] description` (<= 72 chars)
- [ ] All verification commands passing locally

---

## Never do

- Put a price or supplier in anything a logged-out visitor can reach (`base_price`, `tier_markup_percent`)
- Migrate back to Prisma — it costs 1.85 MB of a 3 MB budget
- Use WebSocket/pooled-TCP Neon mode on a request path
- Use TanStack Query on a public indexable page
- `lastModified: new Date()` in the sitemap
- Hardcode user-visible strings — they come from `messages/{locale}.json`
- Write inline SVGs — use `lucide-react`
- Hand-edit generated files in `drizzle/` — let `drizzle-kit generate` produce them
- Run migrations or permission-sync on boot
- Copy anything from Temsan's schema or admin — architecture patterns only
- Write essay-length comments, development journals, or historical migration lore in code
- Write multi-line narrative commit messages or commit lines exceeding 72 characters
- Run `git commit` or `git push` without asking the user and receiving explicit permission first
- `--no-verify` (never bypass git hooks)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
