# Tavkil (`mini-tavkil`)

B2B cross-border wholesale platform ([tavkil.com](https://tavkil.com)) connecting international buyers with verified Turkish manufacturers. Built with two separate frontends on dedicated domains — a **Next.js 16 App Router Storefront** (`tavkil.com`) and a standalone **React 19 + Vite Admin SPA** (`admin.tavkil.com`) — backed by **Cloudflare Workers (Hono Backend API) + Cloudflare Hyperdrive + Neon Serverless Postgres + Cloudflare R2**.

- **B2B Customer Storefront (`tavkil.com` — Next.js 16):** Multilingual public catalog (`en`, `tr`, `ar` RTL) optimized for SEO/GEO/AEO (zero public prices/suppliers), plus authenticated buyer portal for personalized tier pricing and RFQ / order requests.
- **Vendor / Admin Panel (`admin.tavkil.com` — React 19 + Vite SPA):** Standalone operator dashboard (`apps/admin/`, `base: '/'`) for managing catalog, suppliers, buyers, order requests, RBAC roles, audit logs, and settings.
- **Backend API (`api.tavkil.com` — Hono on Cloudflare Workers):** Dedicated Edge API orchestrator connected via Cloudflare Hyperdrive / pooled HTTP to Neon Serverless Postgres.

---

## Docs

| File                  | What's in it                                                                   |
| --------------------- | ------------------------------------------------------------------------------ |
| **`CLAUDE.md`**       | Hard rules, 3-audience pricing guard, stack, definition of done. Read first.   |
| **`AGENTS.md`**       | Tool-agnostic mirror of `CLAUDE.md` + AI assistant rules.                      |
| **`ARCHITECTURE.md`** | System architecture, Cloudflare Workers limits (128 MB RAM), branching & envs. |
| **`TESTING.md`**      | Vitest + Playwright + Chrome DevTools MCP testing strategy and gates.          |
| `.env.example`        | Required environment variables for local `dev` and production deployments.     |

Product & design specifications live at `~/Documents/foundation-pm/Tavkil/`. Legacy Nest.js/Prisma modules being ported live at `~/Documents/tavkil`.

---

## Layout

```text
apps/
  admin/               Standalone React 19 + Vite Admin SPA (`admin.tavkil.com`, `apps/admin/src/lib/image-resize.ts` handles Canvas → WebP)
src/
  app/
    [locale]/          Storefront (`tavkil.com` — Server Components for public SEO pages; client query on buyer pages)
    api/               Hono API entry point
  server/              Hono API routes (public, buyer, and permission-gated admin endpoints)
  components/          Shared UI primitives (shadcn/ui + Base UI) and catalog components
  lib/
    db/                Drizzle schema, relations, and citext custom type
    queries/           Drizzle data access (`public-product.ts` enforces the anonymous leak-proof shape)
    services/          Domain business logic and publish-gate validations
    media/             Magic-byte upload sniffing (`sniff.ts`) and R2 image URL helpers
    permissions/       Permission catalog (`catalog.ts`) and allowlist helpers
    seo/               Metadata, hreflang, Schema.org JSON-LD, sitemap, and IndexNow helpers
drizzle/               SQL migrations + Drizzle Kit metadata
messages/              Locale dictionaries (`en.json`, `tr.json`, `ar.json`)
e2e/                   Playwright end-to-end test suites (public & admin)
scripts/               Permission sync, FX rate refresh, locale parity, pricing leak & build scripts
wrangler.jsonc         Cloudflare Worker bindings (R2 buckets, Cron Triggers, runtime config)
```

---

## Setup

```bash
pnpm install                  # Installs root Next.js storefront + apps/admin SPA workspace
cp .env.example .env          # Configure local dev environment (uses Neon `dev` branch)

pnpm db:migrate               # Apply Drizzle migrations via DIRECT_URL
pnpm sync:permissions         # Sync Permission table from src/lib/permissions/catalog.ts

pnpm dev                      # Starts Storefront (:3000) + Admin Vite SPA (:5173) in parallel
pnpm preview                  # Build and run locally on the Cloudflare Workers runtime
```

- **Neon Postgres:** Use the **pooled** connection string (`-pooler` host) for `DATABASE_URL` (HTTP mode, allows compute autosuspend) and the direct connection string for `DIRECT_URL` (used by `drizzle-kit` and CLI scripts).
- **Cloudflare R2:** Bound directly via `wrangler.jsonc` (`IMAGES_BUCKET` and `NEXT_INC_CACHE_R2_BUCKET`) with `preview_bucket_name` isolation for local development.
- **Google OAuth:** Ensure `http://localhost:3000/api/auth/callback/google` and `https://tavkil.com/api/auth/callback/google` are registered in Google Cloud Console.

---

## Commands

| Command                   | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `pnpm dev`                | Start Storefront (`:3000`) and Admin SPA (`:5173`) in parallel     |
| `pnpm dev:next`           | Storefront + `/api` only on `:3000`                                |
| `pnpm dev:admin`          | Admin Vite SPA only on `:5173` (with HMR)                          |
| `pnpm preview`            | Build & run against the local Cloudflare Workers runtime           |
| `pnpm deploy`             | Build production bundle (`cf:build:prod`) + deploy to Workers      |
| `pnpm lint`               | ESLint check for Next.js storefront & API                          |
| `pnpm admin:lint`         | ESLint check for Admin SPA                                         |
| `pnpm typecheck`          | Next.js route typegen + TypeScript check                           |
| `pnpm admin:typecheck`    | TypeScript check for Admin SPA                                     |
| `pnpm format:check`       | Prettier formatting check                                          |
| `pnpm check:i18n`         | Verify translation key parity across `en`, `tr`, and `ar`          |
| `pnpm check:pricing-leak` | Guard against price or supplier leaks on public surfaces           |
| `pnpm test`               | Run Vitest unit & component tests                                  |
| `pnpm test:integration`   | Run Vitest database integration tests                              |
| `pnpm e2e`                | Run Playwright E2E test suite                                      |
| `pnpm db:generate`        | Generate Drizzle SQL migration from schema changes                 |
| `pnpm db:migrate`         | Apply pending migrations to the configured database                |
| `pnpm db:studio`          | Open Drizzle Studio                                                |
| `pnpm sync:permissions`   | Sync `permissions` and `role_permissions` tables from `catalog.ts` |
| `pnpm fx:refresh`         | Refresh FX exchange rates (also runs via Cloudflare Cron Trigger)  |

---

## Key Platform Constraints

- **No Sharp on Workers:** Images are downscaled and converted to WebP in the admin browser via Canvas (`apps/admin/src/lib/image-resize.ts`) before uploading to R2, and byte-sniffed on the server (`src/lib/media/sniff.ts`).
- **Nothing runs on boot:** Workers wake per request. Migrations and permission syncing run via explicit CLI/CI scripts, and periodic jobs run via Cloudflare Cron Triggers.
- **No interactive transactions on request paths:** Neon HTTP mode supports `db.batch([q1, q2])`, not interactive `db.transaction(async (tx) => ...)` callbacks.
- **128 MB Worker RAM limit:** Always paginate queries (`LIMIT`) and select lean projections.
