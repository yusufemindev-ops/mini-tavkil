# Tavkil — System Architecture & Infrastructure Guide

This document captures the locked architecture, subdomain topology, monorepo layout, and memory/database constraints for the Tavkil B2B wholesale platform.

---

## 1. System Overview & Subdomain Topology

Tavkil separates public/buyer traffic, internal operator backoffice, and the edge API across three dedicated subdomains (and zero `/admin` routes on the storefront):

```text
                [ CLIENT / FRONTEND LAYER ]
┌─────────────────────────────┐     ┌─────────────────────────────┐
│   B2B Customer Storefront   │     │     Vendor / Admin Panel    │
│         tavkil.com          │     │       admin.tavkil.com      │
│    Next.js 16 (SSR / ISR)   │     │   React 19 + Vite SPA (/)   │
└──────────────┬──────────────┘     └──────────────┬──────────────┘
               │                                   │
               └─────────────────┬─────────────────┘
                                 ▼  [ HTTPS + Credentials (.tavkil.com Cookie) ]
                  ┌─────────────────────────────┐
                  │      Edge Backend API       │
                  │       api.tavkil.com        │
                  │  Hono on Cloudflare Workers │
                  └──────────────┬──────────────┘
                                 │
                                 ▼  [ Fast ~1ms Proxy / HTTP Pool ]
                  ┌─────────────────────────────┐
                  │ Cloudflare Hyperdrive / HTTP│
                  └──────────────┬──────────────┘
                                 │
                                 ▼
                  ┌─────────────────────────────┐
                  │  Neon Serverless Postgres   │ (Single Source of Truth)
                  └─────────────────────────────┘
```

### Domains & Deployments

| Surface                 | Production (`main`)        | Private Staging (`develop`) | Local Dev        | Workspace         | Runtime                                                               |
| :---------------------- | :------------------------- | :-------------------------- | :--------------- | :---------------- | :-------------------------------------------------------------------- |
| **Customer Storefront** | `tavkil.com` (`www` → 308) | `dev.tavkil.com`            | `localhost:3000` | `apps/storefront` | Next.js 16 on Cloudflare Workers (OpenNext SSR/ISR)                   |
| **Admin Backoffice**    | `admin.tavkil.com`         | `admin-dev.tavkil.com`      | `localhost:5173` | `apps/admin`      | React 19 + Vite SPA on Cloudflare Workers Static Assets (`base: '/'`) |
| **Backend API**         | `api.tavkil.com`           | `api-dev.tavkil.com`        | `localhost:8787` | `apps/api`        | Standalone Hono Worker (Drizzle, R2 `IMAGES`, Cron FX)                |
| **Shared Contracts**    | —                          | —                           | —                | `packages/shared` | Shared Drizzle schema/client, RBAC permissions, country catalog       |

### Why Single-Level Subdomains (No `/admin` on `tavkil.com`)

1. **Zero Backoffice Exposure on Storefront:** `tavkil.com/admin` does not exist (returns 404). `admin.tavkil.com` and `*-dev.tavkil.com` are gated behind Cloudflare Zero Trust Access policies without affecting public customer traffic.
2. **Free Universal SSL Coverage:** Single-level hyphenated staging subdomains (`dev.tavkil.com`, `admin-dev.tavkil.com`, `api-dev.tavkil.com`) are automatically covered by Cloudflare's free `*.tavkil.com` wildcard SSL certificate (unlike multi-level `*.dev.tavkil.com` subdomains).
3. **Private Staging (`develop` branch):** The `dev` environment runs with `SITE_INDEXABLE=false`, emits `X-Robots-Tag: noindex, nofollow, noarchive` on every response, blocks crawlers in `robots.txt`, disables IndexNow pings, and sits behind a Cloudflare Zero Trust Access email allowlist.
4. **Independent Blast Radius & Deploys:** Deploying an admin UI or API change takes seconds and never rebuilds or risks the revenue-generating storefront (`tavkil.com`).
5. **Worker Memory & Bundle Isolation:** Splitting `apps/storefront`, `apps/admin`, and `apps/api` keeps each Worker well below Cloudflare's bundle and 128 MB isolate RAM limits.

---

## 2. Cross-Subdomain Auth, CORS & Cache Revalidation

### Authentication (`Better Auth` + Google OAuth)

- **Shared Parent Cookie Domain with Environment Prefix Isolation:** Better Auth issues `HttpOnly`, `Secure`, `SameSite=Lax` session cookies scoped to `.tavkil.com` (`crossSubDomainCookies: { enabled: true, domain: '.tavkil.com' }`). Production uses the default `better-auth` cookie prefix while staging (`*-dev.tavkil.com` / `dev.tavkil.com`) uses `cookiePrefix: 'tavkil-dev'` so staging and production sessions never collide.
- **Trusted Origins & CORS:** Hono enforces strict CORS (`credentials: true`) restricted to `https://tavkil.com`, `https://www.tavkil.com`, `https://admin.tavkil.com`, `https://dev.tavkil.com`, and `https://admin-dev.tavkil.com` (plus `http://localhost:3000`, `http://localhost:5173`, and `http://localhost:8787` in local development).

### Cross-Worker Storefront ISR Cache Invalidation

- When an admin publishes or edits a product, category, or setting on `api.tavkil.com` (or `api-dev.tavkil.com`), `src/lib/cache.ts` triggers storefront ISR cache invalidation (`POST /api/internal/revalidate`) on `STOREFRONT_URL` (`https://tavkil.com` or `https://dev.tavkil.com`) authenticated via `x-revalidate-secret`.

---

## 3. Cloudflare Workers Paid Plan (Target Specs)

- **Base Cost:** $5/month (Standard usage model).
- **Included Monthly Allotment:** 10 million requests + 30 million CPU milliseconds (extra: $0.30/M requests, $0.02/M CPU ms).
- **CPU Time Limit:** Default 30 seconds per request (configurable up to 5 minutes in wrangler config).
- **Wall-Clock / Network Time:** Unlimited (as long as the client connection remains active and streaming).
- **Outbound Subrequests:** 10,000 per invocation (vs 50 on Free tier).
- **Memory Cap:** **128 MB per isolate** (strict hard limit across both Free and Paid tiers).

---

## 4. Memory & Neon Database Constraints (128 MB RAM Boundary)

### The 128 MB Hard Boundary

A Worker instance terminates with an unrecoverable **Out-Of-Memory (OOM)** error if RAM consumption exceeds 128 MB.

### Critical Rules for Data Access

1. **Strict Pagination Everywhere**:
   - **NEVER** run unbounded queries like `SELECT * FROM products`.
   - Every catalog or admin listing query must enforce `LIMIT` (e.g. 20–50 items) and cursor/offset pagination.
2. **Lean Projections**:
   - Select only the necessary columns for lists. Do not load large text, HTML, or JSON blobs unless rendering a single product detail page.
3. **Streaming for Large Payloads**:
   - When generating large CSVs or exporting catalogs, stream results via Web Streams rather than buffering arrays in worker memory.
4. **Connection Optimization**:
   - Use Neon pooled HTTP connections (`@neondatabase/serverless`) / Cloudflare Hyperdrive with Drizzle to avoid edge TLS handshake overhead.

---

## 5. Asynchronous Tasks & Media Processing

1. **Background Tasks (Emails, Notifications, IndexNow)**:
   - Use `ctx.waitUntil()` for fire-and-forget notifications and IndexNow pings.
   - Use Cloudflare Cron Triggers (`0 */2 * * *`) for scheduled periodic jobs (FX currency rate syncing).
2. **Image Processing**:
   - Cloudflare Workers cannot run native C/C++ libraries like `sharp`.
   - All image resizing happens in the admin browser using the Canvas WebP pipeline (`apps/admin/src/lib/image-resize.ts`, max 1600px) before uploading to Cloudflare R2 (`IMAGES` binding).

---

## 6. Branching & Environments

- **Git Branches**:
  - `main`: Clean, stable production releases.
  - `develop`: Active feature development, testing, and staging.
- **Neon Database**:
  - `main` branch: Production database.
  - `dev` branch: Cloned instantly in Neon dashboard for zero-risk schema migration testing.
- **R2 Storage**:
  - Uses `preview_bucket_name` in `wrangler.jsonc` to isolate dev uploads from production assets.
- **Production Secrets Lifecycle**:
  - `.env.prod` is a temporary local bridge for manual CLI deployments (`pnpm deploy`). Once GitHub Actions auto-deploy on merge to `main` is configured with repository secrets, `.env.prod` will be completely removed from local machines.

---

## 7. Accepted Design & Accessibility Decisions

- **Brand Orange & WhatsApp Green on Buttons**:
  - Brand orange with white text (`#f2640c` on white ≈ 3.18:1) and WhatsApp green with white text (`#25D366` on white ≈ 1.98:1) deliberately fail WCAG AA 4.5:1 text contrast on buttons to preserve brand identity.
  - Alternatives (dark text or muted greens) were evaluated and rejected for diluting recognition.
  - Accepted decision: `e2e/public/a11y.spec.ts` explicitly permits these pairings while enforcing strict WCAG AA contrast across all other UI elements.
