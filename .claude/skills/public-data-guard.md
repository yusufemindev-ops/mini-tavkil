# Skill: public-data-guard

The most important security and commercial rule in this repo: **Pricing and supplier visibility across our 3 audiences.**

## The 3-Audience Rule

### 1. Public (Anonymous Storefront)

`price` (any form: `base_price`, `tier_markup_percent`, `unit_price`, cost) and `supplier` identities never appear in:

- Any page, component, or route handler reachable without an authenticated session
- `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`
- JSON-LD — `Product` is rendered **without `offers`**
- Error responses, including `details` and stack traces
- HTML comments, `data-*` attributes, or serialized RSC payloads

> **Note on RSC serialization:** A field can leak without being displayed. If a Server Component receives an object containing `basePriceAmount` and passes it to a Client Component, that value is serialized into the HTML payload. **Strip at the query boundary, never at the render layer.**

### 2. Buyer (Authenticated Storefront)

- Logged-in, active buyers see **only** the server-computed personalized `unitPrice` (`base_price × (1 + buyer.tier_markup_percent / 100)`).
- Raw `base_price` (`basePriceAmount`, `basePriceCurrency`) and `tier_markup_percent` (`tierMarkupPercent`) are **strictly admin-only** and must never appear in any buyer API response or buyer SSR/RSC payload.

### 3. Admin (`/api/admin/*`)

- Full visibility (`basePriceAmount`, `basePriceCurrency`, `tierMarkupPercent`, supplier details, internal notes).
- Strictly gated behind admin authentication + `requirePermission(req, 'domain:action')`.

## How It Is Enforced

1. **Anonymous Query Boundary (`src/lib/queries/public-product.ts`):**
   Exports `PublicProduct`, `publicProduct()`, and `publicProducts()`. The `PublicProduct` type has **no price fields and no supplier fields at all** (absent, not optional), making an anonymous leak a compile-time error.
2. **Buyer Query / Service Boundary:**
   Buyer-facing queries and services compute `{ unitPrice, currency }` server-side and strip `basePriceAmount` and `tierMarkupPercent` before returning.
3. **Admin Service & Route Boundary (`src/lib/services/*.ts` & `src/lib/api/handler.ts`):**
   Admin services that access prices or suppliers are only called from `/api/admin/*` route handlers wrapped in `adminRoute(permission, ...)` (`src/lib/api/handler.ts`), which enforces admin authentication, permission checks, and `Cache-Control: private, no-store`. `src/lib/queries/import-boundary.test.ts` verifies that nothing under `src/app/[locale]` or `src/components/` imports an admin service or references a `suppliers` table.

## When Writing Code

- Public page needs product data → call `publicProduct` / `publicProducts`. Nothing else.
- Need a new field publicly → add it to `PublicProduct` deliberately in `src/lib/queries/public-product.ts` after verifying it is safe for anonymous crawlers and visitors.
- Buyer page/endpoint needs pricing → return only the computed `unitPrice` and `currency`, never the underlying base price or markup percentage.
- Never use `as any` or spread a raw Drizzle product/buyer row into a public or buyer response.

## Verification & Tests

- `pnpm check:pricing-leak` — Static guard scanning public routes and components.
- `public-product.test.ts` & `public-product.integration.test.ts` — Deep-walks returned objects in all 3 locales to assert no price or supplier keys exist.
- Playwright E2E leak specs — Asserts against rendered HTML and network payloads.
