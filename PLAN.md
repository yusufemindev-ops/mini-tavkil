# mini-tavkil — the plan

Everything needed to finish this project. Decisions first, then numbered steps.
Work top to bottom. Commit and push to `main` after every step.

**Status:** steps 1–3 done and deployed. Start at step 4.

Live: https://mini-tavkil.yusufemin-dev.workers.dev

---

## 1. What this is

**mini-tavkil is the successor to Tavkil.** Same brand, same domain (`tavkil.com`);
the `tavkil` repo retires once this ships. The name is only because the folder
`~/Documents/tavkil` was taken.

A **public product showcase** with a **small admin dashboard**. Buyers never sign in.
Prices are never public. Orders start with a contact form.

Built from Tavkil's own UI, re-platformed onto one Next.js app on Neon + Cloudflare.

**Guiding principle:** when a Tavkil feature is more machinery than this project needs,
cut the machinery, not the capability. Delete UI before deleting data models. Prefer
fixed-in-code config over runtime editors.

## 2. Stack — measured, not assumed

| Layer   | Choice                                          | Note                                         |
| ------- | ----------------------------------------------- | -------------------------------------------- |
| App     | Next.js 16 App Router, single deployable        | storefront + `/api` + `/admin` in one Worker |
| DB      | Neon Postgres (Frankfurt) + **Drizzle**         | Prisma cost 1.85 MB of a 3 MB bundle         |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` | free plan; 1.02 MB used of 3 MB              |
| Storage | Cloudflare R2 — `tavkil-images`, `tavkil-cache` | Worker bindings, no S3 credentials           |
| Auth    | Better Auth + Google, **admin only**            | `ADMIN_ALLOWLIST`                            |
| UI      | shadcn/ui (Base UI) + Tailwind v4 + lucide      | RTL enabled                                  |
| i18n    | next-intl — EN / TR / AR, localized slugs       |                                              |
| Tests   | Vitest + Playwright + Chrome DevTools MCP       | see `TESTING.md`                             |

Version parity with `tavkil/storefront` is near-identical (next 16.2.x, react 19.2.x,
tailwind v4, next-intl 4.x, base-ui 1.x), so Tavkil's components drop in unchanged.

## 3. Decisions

- **No buyer sign-in.** Drops routes `login`, `cart`, `request`, `orders`, `account`
  and component folders `auth/`, `cart/`, `orders/`, `account/`, `notifications/`.
  Also drops TanStack Query + MSW from public pages.
- **No public prices.** Prices live on the product row, admin-only.
- **No account requests.** Drops `account-requests`, `profile-edit-requests`, `buyers`.
- **Suppliers stay, admin-only.** Tables kept, removed from every storefront surface.
- **Admin = Tavkil's dashboard** minus the Buyers and Operations nav sections.
- **Contact form survives** — Turnstile + Cloudflare Email Service. The only public write.
- **Audit log dropped.** Delete the page, the `audit_log` writes, the permission domain.
- **Full catalog kept** — variants, options, attributes, multi-supplier. Already built
  in Tavkil; the cost is query rewriting, not building.
- **USD + TRY only.** `currencies` / `fx_rates` stay.
- **One branch, one database, one bucket.** No develop, no staging. See `CLAUDE.md` §7.

### The one enforcement rule

Public queries return a shape with **no `price` and no `supplier` field at all** —
absent, not optional. One `publicProduct()` in `src/lib/queries/public-product.ts`.
A leak becomes a compile error. This replaces Tavkil's three-DTO discipline.

### Simplified user management

Tavkil's RBAC is 39 permissions across 12 domains and 1078 lines of UI. The complexity
is in the **editor**, not the model — `permissions/catalog.ts` already hardcodes
`ROLE_GRANTS`.

| Decision                    | Detail                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------- |
| Delete `role-edit-page.tsx` | 421 lines. No custom roles, no permission checkbox grid.                           |
| Three roles, fixed in code  | **Owner** · **Catalog manager** (products/categories/suppliers/media) · **Viewer** |
| Users page → a list         | Email, role dropdown, remove. ~150 lines instead of 657.                           |
| Keep the tables             | `roles` / `permissions` / `role_permissions` cost nothing.                         |
| Keep permission checks      | `@RequirePermission` becomes a function call. Same colon notation.                 |
| Catalog → ~29 permissions   | Drops `buyers`, `orders`, `account_requests` domains.                              |

Keep roles because catalog entry is manual — the moment someone helps with data entry,
they should edit products but not settings or users.

### Settings page — six sections

| Section              | Decision                                                            |
| -------------------- | ------------------------------------------------------------------- |
| Branding             | Keep                                                                |
| SEO defaults         | Keep                                                                |
| Contact & social     | Keep                                                                |
| Currencies           | Keep — USD + TRY                                                    |
| Transactional emails | **Delete the template table.** Keep one field: inquiry destination. |
| FX rate updates      | Keep the logic, re-host the timer as a Cron Trigger — see step 12   |

Fix the subtitle: it still says "default tier markup", which no longer exists.

### Media — browser-side resize

Sharp can't run on Workers. Temsan solved this in 34 lines: the admin downscales with
`createImageBitmap` + canvas to ≤1600px, re-encodes WebP via `canvas.toBlob`, POSTs to
`/api/admin/upload`, which puts it straight into R2. The Worker never touches image bytes.

Trade-off: one size per image instead of Tavkil's 4 variants. Fine for a showcase; if
responsive sizes matter later, do it at delivery with Cloudflare Image Resizing.

### SEO — the one area we exceed Tavkil

Tavkil's SEO is thinner than its docs claim: JSON-LD is Organization + WebSite only
(no Product, no BreadcrumbList), the sitemap lists 4 static routes, IndexNow was never
implemented. All three get built properly here.

- `Product` JSON-LD **without `offers`** — no public price, and faking one is spam.
  Compete on completeness, `BreadcrumbList`, category pages, and `llms-full.txt`.
- **Sitemap `lastModified` comes from the row's `updated_at`**, never `new Date()`.
  A wrong `lastModified` makes Google crawl you _slower_.
- IndexNow ping on publish — instant for Bing/Yandex. Google uses neither IndexNow nor
  sitemap pings (retired 2023); for Google it's accurate `lastModified`, Search Console,
  and **internal linking** so every product is ~3 clicks from home.
- `SITE_INDEXABLE=false` until the custom domain is attached and the SEO steps are done.

---

# STEPS

Rules for every step: `pnpm typecheck` → `pnpm test` → commit → push. Deploy at the end
of any step that changes runtime behaviour, then verify the live URL actually works.
Never mark a step done without running it.

**Every step that touches UI** also gets a look in a real browser via the Chrome
DevTools MCP before it's called done — all three locales, and 375px wide. Don't defer
all UI checking to step 14; by then it's a pile.

## ✅ 1. Scaffold — DONE

Next.js 16 + React 19 + Tailwind v4 + shadcn (Base UI, RTL) + Vitest + Playwright +
lefthook. `wrangler.jsonc` with both R2 bindings and the cron trigger,
`open-next.config.ts` with the R2 incremental cache.

## ✅ 2. Database — DONE

Tavkil's 34 SQL migrations applied to Neon Frankfurt → 32 tables. `drizzle-kit pull`
introspected them into `src/lib/db/schema.ts` (705 lines, 324 columns, 38 FKs, 51
indexes) + `relations.ts`. `citext` hand-defined in `src/lib/db/citext.ts` because
introspection doesn't recognise it.

## ✅ 3. Deploy + seed — DONE

Live on Workers, 6 secrets set, Google OAuth configured for 4 origins.
`pnpm seed` → 3 categories, 12 products, 2 suppliers, 51 translations EN/TR/AR.
`/api/health` returns real counts.

## 4. i18n + storefront shell

1. Copy from `~/Documents/tavkil/storefront/src`: `i18n/`, `messages/`,
   `middleware.ts`, `app/[locale]/layout.tsx`, `components/site-header.tsx`,
   `site-footer.tsx`, `locale-switcher.tsx`, `theme-toggle.tsx`, `providers.tsx`.
2. Vendor `@repo/tokens` (115 lines CSS) into `globals.css` and `@repo/icons`
   (249 lines) as `src/components/icons.tsx`. Drop `@repo/countries` unless contact needs it.
3. Delete every import of TanStack Query and MSW from anything under `[locale]`.
4. Verify: `/en`, `/tr`, `/ar` all render, AR is RTL, the switcher preserves the path.

## 5. Public query layer

Implement `src/lib/queries/public-product.ts` — the signatures are already written there.

- `publicProduct(slug, locale)` and `publicProducts(filter)`
- Join `products` → `product_translations` (by locale) → `product_images` → `categories`
- **Select no price column and no supplier column.** Ever.
- Add `publicCategory` / `publicCategories` alongside
- Only `status = 'published'` rows, and only where that locale has a complete translation
- Return `updatedAt` — the sitemap needs it

Then `src/lib/queries/admin-*.ts` for admin reads, which may include price and supplier.

## 6. Storefront pages

Port from `tavkil/storefront/src/app/[locale]`: `page.tsx`, `catalogue/`,
`catalogue/[category]/`, `product/[slug]/`, `about/`, `contact/`.

- Swap `src/lib/api/*` calls for the step-5 query functions. Server Components only.
- **Strip supplier** from 6 places: home (`tv-showcase`), `product/[slug]`,
  `catalogue/[category]`, `about`; delete `components/catalog/supplier-card.tsx`.
- Replace the cart CTA with **"Request a quote"** → contact form.
- Delete routes `login`, `cart`, `request`, `orders`, `account` and component folders
  `auth/`, `cart/`, `orders/`, `account/`, `notifications/`.
- Verify each page live in all 3 locales with the Chrome DevTools MCP. Check
  **view-source** for price/supplier leaks, not just the rendered DOM.

## 7. Admin auth

- Better Auth + Google in `src/lib/auth.ts`, mounted at `/api/auth/[...all]`
- `ADMIN_ALLOWLIST` guard on `/admin/*` and `/api/admin/*`; non-allowlisted → rejected
- `requirePermission(req, 'x:y')` helper, same colon strings as Tavkil
- `pnpm sync:permissions` script — port `permissions-sync.service.ts`, drop the
  `onApplicationBootstrap` hook, run it over `DIRECT_URL` (TCP) so the advisory-lock
  transaction works. Then run it.

## 8. Port the services

Follow `.claude/skills/port-nest-module.md` exactly — it has the Prisma→Drizzle mapping
table. Source: `~/Documents/tavkil/backend/src/modules/`.

Order: **categories → products → suppliers → media → settings + currencies → rbac**

Per module: service → plain functions in `src/lib/services/`, controller → route
handlers in `src/app/api/`, keep URL paths identical to Tavkil's so the admin SPA needs
no changes. Business logic unchanged; queries rewritten.

**Do not port** `orders`, `buyers`, `account-requests`, `profile-edit-requests`,
`audit-log`.

Watch: array-form `$transaction([...])` → `db.batch([...])`. Interactive transactions
don't work on request paths.

## 9. Mount the admin

1. `pnpm build` Tavkil's Vite admin as-is
2. Serve the output under `/admin` as Worker static assets, SPA-fallback to `index.html`
3. Point its API base at same-origin
4. Remove **Buyers** and **Operations** from `nav-items.ts`
5. Delete the two buyer/order stat tiles from `/dashboard`
6. Delete `role-edit-page.tsx`; reduce `users-page.tsx` to a list with a role dropdown

Do **not** rewrite the admin as Next.js routes.

## 10. Media pipeline

Port from `~/Documents/temsan`: `lib/image-resize.ts`,
`components/admin/ImageDropzone.tsx`, `app/api/admin/upload/route.ts`.
Upload writes to the `IMAGES` R2 binding; public URL is `NEXT_PUBLIC_R2_PUBLIC_URL`.
Verify: upload in admin → WebP lands in R2 → renders on the storefront.

## 11. SEO

- `generateMetadata` on all 6 routes: canonical, hreflang ×3 + `x-default`, OG
- JSON-LD: `Organization` + `WebSite` (home), `CollectionPage` + `ItemList` +
  `BreadcrumbList` (category), `Product` **without `offers`** + `BreadcrumbList` (product)
- `app/sitemap.ts` — DB-driven, all products + categories × locales,
  **`lastModified` from `updated_at`**, `alternates.languages`, cached via `revalidate`,
  only locales with real content
- `robots.ts` honouring `SITE_INDEXABLE`
- `llms.txt` + `llms-full.txt` covering the catalogue — no prices, no suppliers
- IndexNow ping on publish/unpublish using `INDEXNOW_API_KEY`

## 12. FX cron

Port the Frankfurter fetch (fallback `open.er-api`, SAR/AED are USD-pegged and never
fetched) into a `scheduled()` handler. The trigger is already in `wrangler.jsonc`
(`0 6 * * *`). Wire Settings' "Refresh now" to a route handler running the same
function; the run-history list reads `fx_rate_runs` unchanged.

## 13. Contact form

Turnstile widget + server-side siteverify, then send via **Cloudflare Email Service**
(Postmark was dropped). Rate-limit it. This is the only public write and the only
conversion path — make the success state unambiguous.

## 14. Verification — five passes, all of them

Don't collapse these into "ran the tests". Each catches a different class of failure.

### 14a. Automated — Vitest

- **Public-leak suite** (the one that must never be skipped) — every public query and
  route handler asserts no `price` / `supplier` key anywhere in the returned object,
  nested and arrays included
- Unit: slug generation, locale fallback, FX conversion, permission resolution
- Component: RHF + zod validation paths, image dropzone resize, locale switcher
- Integration: route handlers, happy path + permission-denied per module

One live database — tests create only `e2e-` prefixed rows and delete them in teardown,
pass or fail. **Never a broad delete.**

### 14b. Automated — Playwright E2E

All 11 flows in `TESTING.md` §2. Priority order if time runs short: **1, 2, 8**, then
the rest. Port the harness from `~/Documents/temsan/e2e` — session-saving, admin/public
projects, and `@axe-core/playwright` are already wired there.

Run against the **deployed** URL, not just localhost — `E2E_BASE_URL` is supported in
`playwright.config.ts`.

### 14c. Manual — Chrome DevTools MCP

Automated tests confirm what you thought to assert. This pass finds what you didn't.
Drive a real browser through every page, in **all three locales**:

- Does it actually look right, or merely render without throwing?
- **View-source** each public page and grep for price/supplier — the DOM is not enough;
  a Server Component passing an object to a Client Component serialises it into the HTML
- Console clean? Any failed network requests, 404 images, layout shift on load?
- AR: is it genuinely RTL — mirrored layout, correct text alignment, icons flipped —
  or just Arabic text in an LTR shell?
- Resize to 375px. Does anything overflow horizontally?

### 14d. UI quality — `/web-interface-guidelines`

Run the skill against the storefront and admin. It's a checklist for interaction,
layout, forms, content, and performance — the things that separate "works" from "good".
Fix what it flags.

Alongside it, check the house rules:

- Every UI primitive comes from `src/components/ui` (shadcn/Base UI). No hand-rolled
  buttons, inputs, dialogs, or tables.
- **No inline SVG** — `lucide-react` only
- **No hardcoded user-visible strings** — everything from `messages/{locale}.json`,
  all three files in parity
- Loading and empty states exist on every list and form. A blank screen during fetch is a bug.
- Focus states visible, forms keyboard-navigable, labels bound to inputs

### 14e. Accessibility + performance

- `@axe-core/playwright` on every public page — WCAG 2.1 AA, zero violations
- Lighthouse via Chrome DevTools MCP on home, category, product: Core Web Vitals,
  LCP under control, no CLS from images loading without dimensions
- `pnpm exec wrangler deploy --dry-run` — bundle still well under 3 MB

## 15. Go live

1. Attach `tavkil.com` as a Custom Domain on the Worker
2. Update `.env.production` and the `BETTER_AUTH_URL` secret to the real domain
3. Flip `SITE_INDEXABLE=true`
4. Swap `NEXT_PUBLIC_R2_PUBLIC_URL` to `images.tavkil.com` (r2.dev is rate-limited and
   not for production traffic)
5. Deploy, submit the sitemap in Search Console, verify Rich Results
6. Full Playwright run + Lighthouse via Chrome DevTools MCP on the top pages

---

## Environment

`.env` — 14 keys. R2 needs no credentials (it's a binding). `DATABASE_URL` is Neon
**pooled HTTP** so compute autosuspends and the free 100 CU-hours last; `DIRECT_URL` is
direct TCP for `drizzle-kit` and scripts. `.dev.vars` is a symlink to `.env`.
Production secrets are set with `wrangler secret bulk`.

Still empty: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` — needed at step 13.

## Reference

- Tavkil code — `~/Documents/tavkil` (storefront, admin, backend/src/modules)
- Tavkil docs — `~/Documents/foundation-pm/Tavkil/`
- Temsan — `~/Documents/temsan` (Cloudflare/Neon patterns only, never its schema or admin)
- Rules — `CLAUDE.md`; skills in `.claude/skills/`; testing in `TESTING.md`
