# mini-tavkil — build plan

> Working plan. Not a spec. Update as decisions land.
> Status: **planning** — no code yet.

---

## 1. What this is

A stripped-down Tavkil: a **public product showcase** with a **small admin dashboard**.
Buyers do not sign in. Prices are never public. Orders happen by contacting us.

Built from **Tavkil's own code** (storefront UI + admin UI), re-platformed onto the
**Temsan approach** (single Next.js app, Neon, Cloudflare). Temsan is a reference for
_architecture only_ — none of its schema or admin is copied.

**Guiding principle: simplify and ship fast.** When a Tavkil feature is more machinery
than this project needs, cut the machinery — not the capability. Prefer deleting UI over
deleting data models, and prefer fixed-in-code config over runtime editors.

## 2. Stack

| Layer   | Choice                                          | Note                        |
| ------- | ----------------------------------------------- | --------------------------- |
| App     | Next.js 16 (App Router), single deployable      | No Nest.js backend          |
| DB      | Neon Postgres + **Drizzle**                     | Prisma can't run on Workers |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` | `wrangler deploy`           |
| Storage | Cloudflare R2                                   | product images              |
| Auth    | Better Auth + Google — **admin only**           | allowlist-gated `/admin/*`  |
| UI      | shadcn/ui + Tailwind v4 + @base-ui/react        | ported from Tavkil          |
| i18n    | next-intl — EN / TR / AR                        | plumbing day 1, copy later  |

Version parity between `tavkil/storefront` and `temsan` is near-identical
(next 16.2.x, react 19.2.x, tailwind v4, next-intl 4.x, base-ui 1.x), so Tavkil's
components drop in essentially unchanged.

## 3. Decisions locked

- **No buyer sign-in.** Drops: login, cart, request, orders, account routes; the
  `auth/`, `cart/`, `orders/`, `account/`, `notifications/` component folders;
  TanStack Query + MSW on public pages.
- **No public prices.** Prices live on the product row, admin-only.
- **No account requests.** Drops `account-requests`, `profile-edit-requests`, `buyers`.
- **Suppliers stay — admin-only.** Tables kept; removed from all storefront surfaces.
- **Admin = Tavkil's dashboard**, minus the Buyers and Operations sections.
- **Contact form survives** (Turnstile + Postmark) — the only public write.

### Simplified user management

Tavkil's RBAC is over-built for this project: **39 permissions across 12 domains**,
1078 lines across two pages (`users-page.tsx` 657, `role-edit-page.tsx` 421).

**The complexity is in the editor, not the model.** `permissions/catalog.ts` already
hardcodes `ROLE_GRANTS` — the role→permission mapping lives in code. The role editor
only exists to override it at runtime. We don't need that.

**Keep the model, delete the editor:**

| Decision                               | Detail                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Delete `role-edit-page.tsx`**        | 421 lines gone. No custom roles, no permission checkbox grid.                                                  |
| **Three fixed roles, defined in code** | **Owner** (everything) · **Catalog manager** (products, categories, suppliers, media) · **Viewer** (read-only) |
| **Users page → a list**                | Email, role dropdown, remove. ~150 lines instead of 657.                                                       |
| **Keep the tables**                    | `Role` / `Permission` / `RolePermission` cost nothing and the backend already uses them.                       |
| **Keep `@RequirePermission`**          | Ported as a plain function call in each route handler. Same colon notation.                                    |
| **Catalog shrinks to ~29 permissions** | Drops the `buyers`, `orders`, `account_requests` domains.                                                      |

**Why keep roles at all:** catalog entry is manual. The first time someone helps with
data entry, you want them editing products but not settings or users. That's exactly
the Owner / Catalog-manager split — and it's free, since `ROLE_GRANTS` already defines it.

**`permissions-sync` becomes a script.** It currently runs on Nest boot
(`onApplicationBootstrap`) to fill the `Permission` table from `catalog.ts`. Workers have
no boot, so nothing would populate it. Make it `pnpm sync:permissions`, run on deploy or
when the catalog changes. Running it from a machine also sidesteps the
interactive-transaction / WebSocket issue in `DAY-1.md`.

### Settings page

One page, 563 lines, six sections. Verdict per section:

| Section              | Decision                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Branding             | **Keep** — cheap, no backend complexity                                                                               |
| SEO defaults         | **Keep**                                                                                                              |
| Contact & social     | **Keep**                                                                                                              |
| Currencies           | **Keep** — USD + TRY only                                                                                             |
| Transactional emails | **Delete the template table.** Keep one field: _"send contact-form inquiries to [email]"_ — the only mail still sent. |
| FX rate updates      | **Keep, but re-host the timer** — see below                                                                           |

**Copy fix:** the page subtitle still reads _"Locales, currencies, default tier markup,
system preferences."_ There is no markup control — dead copy from the tier-pricing era.

#### FX updates — the one thing that can't be copied across

The logic is fine and stays as-is: fetch USD→TRY from **Frankfurter** (fallback
`open.er-api`), retry every 2h until it succeeds, SAR/AED are USD-pegged and never
fetched. Rates land in `FxRate` / `FxRateRun`.

What can't move is **where it runs**. Today it's a Nest background process
(`WORKER_MODE`) that stays alive and wakes daily. Cloudflare Workers don't stay alive —
a Worker starts on a request and dies after it. A daily timer has nowhere to live.

**Mini-tavkil approach — Cloudflare Cron Triggers:**

```jsonc
// wrangler.jsonc
"triggers": { "crons": ["0 6 * * *"] }   // daily 06:00 UTC
```

Move the fetch into a `scheduled()` handler, delete the timer loop, let Cloudflare do the
timing. Then rewire the Settings UI: **"Refresh now"** hits a route handler that runs the
same function on demand, and the run-history list reads `FxRateRun` unchanged.

~half a day. The only piece of Tavkil that needs rewriting rather than porting.

### Audit log — dropped

Delete `audit-log-page.tsx`, the `AuditLog` table, and the audit-write calls in the
ported services. Removes the `audit_log` permission domain too.

### Media pipeline — browser-side, copy Temsan's approach

Tavkil uses **Sharp server-side**: 4 sizes × 2 formats per image, at upload time.
**Sharp can't run on Cloudflare Workers**, and bundling a WASM encoder would blow the
3 MB Worker limit.

Temsan already solved this — `temsan/lib/image-resize.ts`, **34 lines**:

1. Admin picks a file in `ImageDropzone`
2. Browser downscales it with `createImageBitmap` + canvas (longest side ≤ 1600px)
3. `canvas.toBlob(…, "image/webp", 0.8)` re-encodes to WebP
4. POST the WebP to `/api/admin/upload` → straight into R2

The Worker never touches image bytes — it just stores what it's given. Port
`image-resize.ts`, `ImageDropzone.tsx`, and the upload route from Temsan as-is.

**Trade-off:** one size per image instead of Tavkil's 4 responsive variants. Fine for a
showcase catalog. If responsive sizes matter later, do it at _delivery_ time with
Cloudflare Image Resizing rather than at upload.

### The one enforcement rule

Public queries return a shape that has **no `price` and no `supplier` field at all**.
One `publicProduct()` function in the query layer. A leak becomes a type error,
not a code-review catch. This replaces Tavkil's three-DTO discipline.

## 4. Scope

### Storefront — 6 routes

home · catalogue · category · product · about · contact

Supplier is currently rendered in 6 places that need stripping:
`app/[locale]/page.tsx` (tv-showcase), `product/[slug]/page.tsx`,
`catalogue/[category]/page.tsx`, `about/page.tsx`, and
`components/catalog/supplier-card.tsx` (delete).

### Admin — 3 sections

- **Catalog** — Products, Categories, Suppliers
- **Admin settings** — User management, Audit log, Settings
- **Dashboard** — needs new tiles; current ones are order/buyer counts

Dropped pages (6): buyer accounts, buyer new, buyer edit, account requests,
orders inbox, order detail.

### Schema — ~15 tables (down from Tavkil's 32)

Kept: categories + translations, products + translations, product images,
product attributes, suppliers + translations, settings, locales, audit log,
roles/permissions, better-auth tables.

Dropped: `OrderRequest`, `OrderRequestItem`, `OrderNumberSequence`,
`AccountRequest`, `BuyerProfile`, `ProfileEditRequest`.

**Open:** variants / options / option-values — see §7.

## 5. Realistic sizing

Full build: **~3–4 weeks.** The UI on both sides already exists; the work is
replacing the runtime under it. Three jobs:

1. Drop Nest.js — 15 modules become server actions / route handlers _(biggest)_
2. Prisma → Drizzle — ~15 tables
3. Admin SPA → Next routes — Vite + react-router moves into `/admin`

## 6. Day 1 — see `DAY-1.md`

The runbook below was written for a flat-catalog slice and is superseded by
**`DAY-1.md`**, which keeps the full catalog by reusing Prisma + the admin SPA
as-is. Kept here for reference.

### (superseded) thin vertical slice

Goal: real schema, real data, public catalogue live on Cloudflare, minimal admin.
**Assumes a flat catalog** (no variants/options/attributes/currencies).

| #   | Block         | Hrs | Output                                                                                                                                                                                |
| --- | ------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Scaffold      | 1.0 | Copy `tavkil/storefront` → repo. Add drizzle-kit, `@neondatabase/serverless`, `@opennextjs/cloudflare`, wrangler. Vendor `@repo/tokens` + `@repo/icons`. Delete TanStack Query + MSW. |
| 2   | Schema + seed | 1.5 | 8 tables, push to Neon, seed ~20 products / 5 categories.                                                                                                                             |
| 3   | Data layer    | 1.5 | Delete `src/lib/api/*`. Write `lib/queries/` returning the shapes components already expect. **Load-bearing.**                                                                        |
| 4   | Public pages  | 2.0 | 6 routes ported, prices + suppliers stripped, "Request a quote" CTA replaces cart.                                                                                                    |
| 5   | Admin auth    | 1.0 | Better Auth + Google, `/admin/login`, allowlist guard.                                                                                                                                |
| 6   | Admin CRUD    | 2.0 | Products list + form (incl. price), categories list + form. Server actions, RHF + zod. **Where a day dies.**                                                                          |
| 7   | Deploy        | 1.0 | R2 bucket, `wrangler deploy`, smoke test.                                                                                                                                             |

~10 hours. Blocks 1–5 are predictable; block 6 is the risk.

### Day-1 schema (8 tables)

`categories`, `categoryTranslations`, `products`, `productTranslations`,
`productImages`, `siteSettings`, + better-auth `user` / `session` / `account` / `verification`.

### Explicitly NOT in day 1

Image upload pipeline (seed URLs) · i18n copy beyond EN · SEO / JSON-LD ·
audit log · RBAC (allowlist only) · soft delete · publish gate · tests · IndexNow

### Known trap

Tavkil's admin is a **Vite SPA** — it does not port in a day. Block 6 builds _fresh_
minimal Next.js admin pages reusing Tavkil's shadcn components. The real admin
migration is a later job.

## 7. Resolved — 2026-08-10

| #   | Question                        | Answer                                                                                                                                                                                |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Variants / options / attributes | **Keep all.** Already built in Tavkil — admin forms and storefront filters come free. Cost is porting (Prisma→Drizzle relations, Nest catalog module → server actions), not building. |
| Q2  | Multi-supplier                  | **Keep.** Deals with multiple factories are expected. Suppliers stay admin-only.                                                                                                      |
| Q3  | Currencies                      | **USD + TRY only.** `Currency` / `FxRate` stay. FX worker moves from Nest `WORKER_MODE` → **Cloudflare Cron Trigger** in `wrangler.jsonc`.                                            |
| Q4  | Dashboard tiles                 | Keep `/dashboard`. Two of its four stat tiles count buyers/orders — **just delete those two**. No replacements, no new pages.                                                         |
| Q5  | Route naming                    | **English + localized slugs**, as Tavkil already does (TSC-50). No change.                                                                                                            |
| Q6  | Repo                            | **New repo** — `mini-tavkil`.                                                                                                                                                         |

### Effect on scope

Q1 + Q2 restore the full catalog domain, so the schema is closer to **~22 tables**
than the ~15 in §4: variants, options, option-values, variant-option-values,
attributes, suppliers + translations, currencies, FX rates.

**Revised sizing: ~4 weeks**, not the 2-week flat-catalog case in §5.

Day 1 (§6) is unaffected — it stays a flat-catalog vertical slice to get something
deployed. Variants land in week 2.

## 8. SEO — resolved 2026-08-10

**mini-tavkil replaces Tavkil.** Same brand, same domain (`tavkil.com`), and the
`tavkil` repo is retired once this ships. Not a side project.

### What actually exists in Tavkil today (less than the docs claim)

| File                              | State                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `src/lib/seo/json-ld.tsx` (46 ln) | Organization + WebSite + SearchAction only. **No Product, no BreadcrumbList.** |
| `src/app/sitemap.ts` (24 ln)      | **4 static routes.** Catalog URLs are a TODO comment that never landed.        |
| `src/app/llms.txt/route.ts`       | Exists                                                                         |
| IndexNow                          | A settings field only — **not implemented**                                    |

SEO is the one area where mini-tavkil should be _better_ than Tavkil, not simpler.

| #   | Question                        | Answer                                                                                                                                                                                                                                                             |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q7  | Domain                          | **`tavkil.com`**, already owned. Live from day 1 — never launch on `*.workers.dev` and migrate.                                                                                                                                                                    |
| Q8  | Locales at launch               | **All three (EN/TR/AR).**                                                                                                                                                                                                                                          |
| Q9  | Product JSON-LD without a price | Emit `Product` **without `offers`** — name, image, brand, SKU, description. Google's price/stock rich results need `offers.price`, which we can't provide, and faking it is spam. Compete instead on `BreadcrumbList`, strong category pages, and `llms-full.txt`. |
| Q10 | ISR cache on Workers            | **Configure the R2/KV incremental cache in block 1.** Without it every page renders dynamically → slow TTFB → worse Core Web Vitals and crawl budget.                                                                                                              |
| Q11 | Dynamic sitemap                 | **Build it properly, week 1.** All products + categories × 3 locales, emitting a locale's URL only when that locale actually has content.                                                                                                                          |

### SEO backlog (beyond Tavkil)

- `Product` + `BreadcrumbList` JSON-LD on product and category pages
- DB-driven sitemap — see below
- IndexNow ping on publish — currently unimplemented
- `llms-full.txt` covering the full catalog (the AEO/GEO play, and the one where a
  no-price catalog is not at a disadvantage)

### Getting indexed fast — three levers, only one is the sitemap

**1. The sitemap — one file, done right.**
~200 products × 3 locales ≈ 600 URLs. Next.js only needs `generateSitemaps()` splitting
above 50,000, so a single file is correct.

- **`lastModified` MUST come from the row's `updated_at`.** Tavkil's current sitemap uses
  `new Date()`, which tells Google every page changed on every crawl. Google learns to
  distrust the signal and crawls _slower_. This one line is the difference between a
  sitemap that helps and one that hurts.
- List only genuinely indexable URLs — published, and that locale has real content
  (never English-fallback URLs; they're noindex).
- `alternates.languages` per URL for hreflang.
- Cache with `revalidate` — one cheap query, not a DB hit per crawl.

**2. IndexNow — the actual "fast".**
A single POST on publish; Bing/Yandex/Naver/Seznam know within minutes. Already a
settings field in Tavkil, never implemented. Implement it.

**3. Google uses neither.** Its sitemap ping endpoint was retired in 2023. The levers
that work for Google are: accurate `lastModified`, the sitemap submitted once in Search
Console, and **internal linking** so every product is ~3 clicks from the homepage.
Category pages doing real linking work beat any sitemap trick.

> **sitemap = the complete map · IndexNow = the instant signal · internal linking = what Google actually follows**

## 9. Environment

See **`.env.example`**. Tavkil has 42 keys, Temsan 9 — mini-tavkil lands near Temsan.
The big cut: R2 is a **Worker binding** declared in `wrangler.jsonc`, so all `S3_*`
credentials disappear. `DATABASE_URL` is Neon **pooled HTTP** (autosuspend, cheap CU-hours);
`DIRECT_URL` is the direct connection, used only by `prisma migrate` and scripts.

Keys marked `[carry]` copy straight from Tavkil's `.env` — Google OAuth, Better Auth
secret, allowlist, Turnstile, Postmark, IndexNow.

## 10. Reference

- Tavkil code: `~/Documents/tavkil` — storefront `storefront/`, admin `admin/`
- Tavkil docs: `~/Documents/foundation-pm/Tavkil/`
- Temsan (architecture reference only): `~/Documents/temsan`
