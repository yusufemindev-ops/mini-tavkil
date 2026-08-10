# mini-tavkil — the plan

Everything needed to finish this project. Decisions first, then numbered steps.
Work top to bottom. Commit and push to `main` after every step.

**Status:** steps 1–5 done. Start at step 6.

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

## ✅ 4. i18n + storefront shell — DONE

next-intl wired (`createNextIntlPlugin` in `next.config.ts`), 392 keys × EN/TR/AR
with a parity test, middleware reduced to locale handling only, `[locale]/layout`
with per-locale fonts and `dir`, header/footer/switcher/theme-toggle ported with
every buyer surface removed, 24 `ui/*` primitives merged, tokens vendored into
`globals.css`, `icons.tsx` aliased onto lucide except the four brand marks lucide
doesn't ship. `/` → `/en`, all three locales 200, `/en/nope` → 404, AR RTL
verified at 1280px and 375px with no overflow and a clean console.

**Carried into step 6:** the ported copy still says "request an account to see
pricing" (hero, footer, about). There are no accounts and no public prices here —
rewrite those strings in all three locales when the real pages land.

<details><summary>Original step-4 instructions</summary>

**Copy from `~/Documents/tavkil/storefront/src`:**

```
i18n/routing.ts  i18n/request.ts  i18n/navigation.ts
middleware.ts                     (91 lines — locale detection + localized slugs)
messages/{en,tr,ar}.json          (namespaces: seo nav home footer account store)
app/[locale]/layout.tsx
components/site-header.tsx  site-header-nav.tsx  site-footer.tsx
components/locale-switcher.tsx  localized-paths.tsx  theme-toggle.tsx  providers.tsx
components/whatsapp-button.tsx
components/ui/*                   (28 files — merge with the shadcn set already here)
lib/utils.ts  lib/env.ts  lib/settings.ts
lib/catalog/localized-path.ts + .test.ts
```

**Vendor the workspace packages** (this repo is not a monorepo):

- `packages/tokens/tokens.css` (115 lines) → append to `src/app/globals.css`
- `packages/icons/src/index.tsx` (249 lines) → `src/components/icons.tsx`
- `packages/countries` (2515 lines) → skip unless the contact form needs a country picker

**Strip:**

- Delete the `account` namespace from all three `messages/*.json` — no buyer accounts
- Remove `notification-bell` from the header, and any account/cart links
- Delete every TanStack Query and MSW import under `[locale]`
- `lib/auth-client.ts` and `lib/protected-routes.ts` — buyer-side, not needed

**Acceptance:** `/en`, `/tr`, `/ar` render; `/` redirects to the default locale; AR is
genuinely RTL (`dir="rtl"`, mirrored layout, not just Arabic text); the switcher keeps
you on the same page; all three message files have identical key sets.

</details>

## ✅ 5. Public query layer — DONE

`publicProduct` · `publicProducts` · `publicProductCount` · `publicCategory` ·
`publicCategories` · `publicSitemapEntries`, plus `admin-products.ts` for the reads
that may include price and supplier. Three layers of enforcement, not one:

1. the public shape has no price and no supplier field, so a leak is a type error
2. `public-product.test.ts` greps the module's own source — the words
   `basePriceAmount`, `supplierId`, `suppliers` never appear in it
3. `public-product.integration.test.ts` runs all six functions against Neon in all
   three locales and deep-walks every returned object for a price-ish key or a
   seeded supplier name — 32 tests
4. `import-boundary.test.ts` asserts nothing under `app/[locale]` or `components/`
   imports an `admin-*` query or names a supplier table

**Note:** `PublicImage` has no `width`/`height` — `product_images` stores neither.
CLS is handled with a fixed aspect-ratio box instead. Step 10's upload route knows
the real dimensions, so add the columns there if responsive `sizes` ever matter.

<details><summary>Original step-5 instructions</summary>

Implement the signatures already stubbed in `src/lib/queries/public-product.ts`.

**Functions:**

```ts
publicProduct(slug: string, locale: Locale): Promise<PublicProduct | null>
publicProducts(filter: { category?: string; featured?: boolean; limit?: number; offset?: number }, locale): Promise<PublicProduct[]>
publicCategory(slug: string, locale): Promise<PublicCategory | null>
publicCategories(locale): Promise<PublicCategory[]>
publicSitemapEntries(): Promise<{ type, slug, locale, updatedAt }[]>
```

**Joins:** `products` → `product_translations` (on locale) → `product_images` →
`categories` → `category_translations`. Variants/options via `product_variants`,
`product_options`, `product_option_values` when the product page needs them.

**Rules, all load-bearing:**

- **Never select `basePriceAmount`, `basePriceCurrency`, `supplierId`, or anything from
  `suppliers`.** Not into a variable, not into a discarded field.
- `status = 'published'` only, and `deletedAt IS NULL`
- Only rows where that locale's translation exists and `isComplete = true` — never fall
  back to English on a public page (those URLs are `noindex`)
- Return `updatedAt` — step 11's sitemap depends on it
- Order by `sortOrder`, then `isFeatured` for home rails

Then `src/lib/queries/admin-products.ts` etc. for admin reads, which **may** include
price and supplier. Different file, different type, called only from `/api/admin/*`.

**Acceptance:** a Vitest test per function asserting no `price`/`supplier` key appears
anywhere in the returned object, nested and arrays included.

</details>

## 6. Storefront pages

Port from `tavkil/storefront/src/app/[locale]/`:

| Port                   | With components                                                                  |
| ---------------------- | -------------------------------------------------------------------------------- |
| `page.tsx` (home)      | `home/*` — tv-showcase, about-teaser, cta-panel, step-card, count-up             |
| `catalogue/`           | `catalog/category-tile.tsx`, `category-rail.tsx`, `category-menu-mobile.tsx`     |
| `catalogue/[category]` | `category-filters`, `category-sort`, `category-product-grid`, `subcategory-tile` |
| `product/[slug]`       | `product/product-gallery`, `product-options`, `product-tabs`, `catalog/thumb`    |
| `about/`, `contact/`   | `ui/captcha.tsx` for contact                                                     |

**Delete outright** — routes `login`, `cart`, `request`, `orders`, `account`, `ui` (the
dev kit page); component folders `auth/`, `cart/`, `orders/`, `account/`,
`notifications/`, `dev/`; `lib/orders/`, `lib/notifications/`.

**Strip price** — delete `product/price-lock.tsx`, `product-price-block.tsx`, and the
price section of `product-buy-panel.tsx`. The panel becomes MOQ + unit + "Request a
quote".

**Strip supplier** — 6 places: `page.tsx` (tv-showcase), `product/[slug]/page.tsx`,
`catalogue/[category]/page.tsx`, `about/page.tsx`, and delete
`components/catalog/supplier-card.tsx`.

**Rewire data** — replace `lib/api/server.ts` / `client.ts` calls with step-5 functions.
Server Components only. Delete `lib/catalog/fixtures.ts` and `lib/api/*`.

**Acceptance:** every page renders in 3 locales; **view-source** on each contains no
price and no supplier name; unknown slug → 404 not 500; 375px wide has no horizontal
scroll.

## 7. Admin auth

1. `src/lib/auth.ts` — Better Auth with the Google social provider, Drizzle adapter
   pointed at the existing `authUser` / `authSession` / `authAccount` / `authVerification`
   tables (already in the schema — do not create new ones)
2. Mount at `src/app/api/auth/[...all]/route.ts`
3. `src/lib/auth-guard.ts` — `requireAdmin(req)` checks the session email against
   `ADMIN_ALLOWLIST`; `requirePermission(req, 'products:edit')` resolves via
   `authUserRoles` → `rolePermissions` → `permissions`
4. Guard `/admin/*` in `middleware.ts` and every `/api/admin/*` handler
5. **`scripts/sync-permissions.ts`** — port `permissions-sync.service.ts`: drop
   `onApplicationBootstrap`, keep the `pg_advisory_xact_lock` transaction, run over
   `DIRECT_URL` with `pg` (TCP, so real transactions work). Copy
   `permissions/catalog.ts` too, minus the `buyers`/`orders`/`account_requests`/`audit_log`
   domains → ~29 permissions. Then run `pnpm sync:permissions`.

**Acceptance:** allowlisted Google account reaches `/admin`; a non-allowlisted one is
rejected; `permissions` table is populated; `/api/admin/*` returns 401 when signed out.

## 8. Port the services

Follow `.claude/skills/port-nest-module.md` — it has the Prisma→Drizzle mapping table
and the per-module checklist. Source: `~/Documents/tavkil/backend/src/modules/`.

**Keep every URL path identical** so the admin SPA needs no changes:

| Module     | Public                  | Admin                                                                                                                           |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| categories | `GET /categories/:slug` | `/admin/categories` · `:id` · `POST reorder` · `PATCH :id` · `DELETE :id` · `:id/publish` · `:id/unpublish`                     |
| products   | `GET /products/:slug`   | `/admin/products` · `counts` · `:id` · `reorder` · `PATCH :id` · `DELETE :id` · `publish` · `unpublish` · `archive` · `restore` |
| suppliers  | —                       | `/admin/suppliers` · `:id` · `PATCH` · `DELETE` · `publish` · `unpublish`                                                       |
| media      | —                       | `/admin/media`                                                                                                                  |
| settings   | `GET /settings`         | `/admin/settings`                                                                                                               |
| currencies | `GET /currencies`       | `/admin/currencies` · `PATCH :code` · `/admin/fx/runs` · `POST /admin/fx/refresh`                                               |
| rbac       | —                       | `/admin/users` · `:id/role` · `:id/suspend` · `:id/reactivate` · `/admin/roles` · `/admin/permissions/catalog`                  |

Order: **categories → products → suppliers → media → settings + currencies → rbac.**

**Do not port:** `orders`, `buyers`, `account-requests`, `profile-edit-requests`,
`audit-log`. Strip audit-write calls from the services you do port.

**Watch:**

- Array-form `$transaction([...])` → `db.batch([...])`. Interactive transactions don't
  work on request paths (Neon HTTP).
- `products.service.ts` is the big one — variants, options, ordering, publish gate. Keep
  the publish-gate validation; it's real business logic.
- Zod DTOs in `dto/` port unchanged — parse at the top of each handler.
- After each module: `wrangler deploy --dry-run` to watch the bundle.

## 9. Mount the admin

1. In `~/Documents/tavkil/admin`, set the API base to same-origin (`/api`) and
   `pnpm build`
2. Copy `dist/` into `public/admin/` here
3. Serve under `/admin` with SPA fallback to `index.html` (Worker static assets)
4. `nav-items.ts` — delete the **Buyers** and **Operations** groups
5. `dashboard-page.tsx` — delete the two buyer/order KPI tiles
6. Delete `features/users/role-edit-page.tsx`; reduce `users-page.tsx` (657 lines) to a
   list: email, role dropdown (Owner / Catalog manager / Viewer), remove
7. Delete `features/{buyers,orders,audit}/` entirely
8. `settings-page.tsx` — delete the Transactional emails table, keep one inquiry-
   destination field; fix the "default tier markup" subtitle

**Do not rewrite the admin as Next.js routes.** It's a Vite SPA and stays one.

**Acceptance:** `/admin` loads behind Google auth, products and categories are listable
and editable, prices show here and only here.

## 10. Media pipeline

Port from `~/Documents/temsan`: `lib/image-resize.ts` (34 lines),
`components/admin/ImageDropzone.tsx`, `app/api/admin/upload/route.ts`.

- Browser: `createImageBitmap` → canvas → longest side ≤1600px →
  `canvas.toBlob(…, 'image/webp', 0.8)`
- POST the WebP to `/api/admin/upload`, which puts it into the `IMAGES` R2 binding
- Public URL = `NEXT_PUBLIC_R2_PUBLIC_URL` + key
- Enforce `MAX_UPLOAD_MB`; reject non-images server-side, not just in the picker
- Write `product_images` rows with `altTranslations` per locale, `isPrimary`, `sortOrder`

**Acceptance:** upload in admin → object appears in `tavkil-images` → renders on the
storefront product page → replaces the placeholder seed URL.

## 11. SEO

**Metadata** — `generateMetadata` on all 6 routes: title, description, canonical
(self-locale), `alternates.languages` for the locales that have content, `x-default`,
OG + Twitter. Port `lib/seo/metadata.ts` (99 lines) and its test.

**JSON-LD** — extend `lib/seo/json-ld.tsx` (currently Organization + WebSite only):

| Page     | Emit                                              |
| -------- | ------------------------------------------------- |
| home     | `Organization` + `WebSite` with `SearchAction`    |
| category | `CollectionPage` + `ItemList` + `BreadcrumbList`  |
| product  | `Product` **without `offers`** + `BreadcrumbList` |
| contact  | `Organization` + `ContactPoint`                   |

`Product` carries name, description, all images, `sku`, `brand`, `category`, and
`additionalProperty` for attributes. **No `offers`, no `price`** — we have no public
price and faking one risks a manual action.

**Sitemap** — rewrite `app/sitemap.ts` (currently 4 static routes):

- Static routes + every published product and category × locales with real content
- **`lastModified` from the row's `updatedAt`** — never `new Date()`
- `alternates.languages` per entry
- `export const revalidate = 3600` so it's one query per hour, not per crawl
- ~600 URLs — single file, no `generateSitemaps()` splitting needed under 50k

**robots.ts** — `disallow: /` when `SITE_INDEXABLE !== 'true'`; otherwise allow, disallow
`/admin` and `/api`, and point at the sitemap.

**llms.txt / llms-full.txt** — the full catalogue as structured facts: names,
categories, attributes, descriptions. No prices, no suppliers.

**IndexNow** — on publish/unpublish of a product or category, POST the URL set with
`INDEXNOW_API_KEY`. Serve the key file at `/{key}.txt`. Fire-and-forget via
`ctx.waitUntil`; never block the response.

**Internal linking** — every product reachable in ~3 clicks from home. Category pages
link to their products and sibling categories. This matters more than the markup.

## 12. FX cron

Port `currencies/fx-rates.service.ts`: fetch USD→TRY from **Frankfurter**, fall back to
`open.er-api`, retry every 2h until it succeeds, SAR/AED are USD-pegged and never
fetched. Rows land in `fx_rates` / `fx_rate_runs`.

- Move the fetch into `scheduled()` — the trigger already exists (`0 6 * * *`)
- `POST /api/admin/fx/refresh` runs the same function on demand (Settings' "Refresh now")
- `GET /api/admin/fx/runs` reads `fx_rate_runs` unchanged
- `pnpm fx:refresh` script for manual runs

**Acceptance:** `pnpm fx:refresh` writes a row; Settings shows the run; USD and TRY both
resolve in the admin.

## 13. Contact form

The only public write and the only conversion path.

1. Turnstile widget (`ui/captcha.tsx` is already ported) with
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
2. `POST /api/contact` — verify the token server-side against Cloudflare siteverify
   **before** anything else; reject on failure
3. Zod-validate name, email, company, message, locale
4. Send via **Cloudflare Email Service** (Postmark was dropped) to the Settings
   inquiry-destination address
5. Rate-limit per IP
6. Unambiguous success state; inline field errors; never lose what the user typed on failure

**Acceptance:** submit end-to-end on the deployed URL, email arrives, bot submissions
without a valid token are rejected.

## 14. Verification & hardening — eight passes, all of them

Don't collapse these into "ran the tests". Each catches a different class of failure.
Install what's missing first:

```bash
pnpm add -D @lhci/cli lighthouse
```

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

### 14e. Accessibility

- `@axe-core/playwright` on all 6 public pages **and** the admin — WCAG 2.1 AA, **zero
  violations**, not "few"
- Keyboard-only pass: every interactive element reachable, visible focus ring, no traps,
  dialogs return focus on close
- Test in AR too — RTL breaks focus order and `aria-label` direction more often than people expect
- Colour contrast ≥ 4.5:1 body, 3:1 large text, in both light and dark themes
- Images have real `alt` from `altTranslations`, not filenames; decorative ones `alt=""`

### 14f. Lighthouse CI — perf, SEO, best-practices

Run against the **deployed** URL, on mobile emulation, for home / category / product:

```bash
pnpm exec lhci autorun --collect.url=https://tavkil.com/en \
  --collect.url=https://tavkil.com/en/catalogue \
  --collect.url=https://tavkil.com/en/product/<slug> \
  --collect.settings.preset=desktop
```

Budgets — fail the run, don't just note them:

| Category       | Min |
| -------------- | --- |
| Performance    | 90  |
| Accessibility  | 100 |
| Best Practices | 95  |
| SEO            | 100 |

Core Web Vitals: **LCP < 2.5s, CLS < 0.1, INP < 200ms**. The usual culprits here will be
hero images without `width`/`height` (CLS), unoptimised R2 images (LCP), and missing
`priority` on the above-fold image.

Add `.lighthouserc.json` with these assertions so it's repeatable, and keep it in CI.

### 14g. SEO validation — beyond the score

Lighthouse's SEO 100 only means the basics are present. Verify the substance:

- **Rich Results Test** (search.google.com/test/rich-results) on a product URL —
  `Product` must validate **without** `offers`, and `BreadcrumbList` must parse
- `curl` the rendered HTML and confirm JSON-LD is **in the source**, not injected client-side
- `/sitemap.xml` — every URL 200s, `lastmod` matches the DB's `updatedAt` (not today's
  date), `hreflang` alternates are reciprocal
- `/robots.txt` — reflects `SITE_INDEXABLE`, points at the sitemap, disallows `/admin` and `/api`
- Canonical on every page points at itself in its own locale — never cross-locale
- `/llms.txt` and `/llms-full.txt` return 200, contain the catalogue, **no prices, no suppliers**
- IndexNow: publish a product, confirm the POST fired and returned 200/202
- Crawl depth: every product reachable within 3 clicks of home

### 14g-bis. Post-deploy stale-cache probe

Found during step 4: for a few minutes after a deploy, `/en` intermittently returned
the **previous** build's 404 with `x-nextjs-cache: HIT` and `x-nextjs-stale-time: 300`.
The R2 incremental cache had the scaffold build's (legitimate, at the time) 404 for a
route the new build serves, and kept handing it out until revalidation replaced it.

So after every deploy, probe each public route ~20× before calling it verified — a
single 200 proves nothing. If a route that changed shape between builds is still
serving the old entry after the 300 s stale window, scope the cache per build with
`NEXT_INC_CACHE_R2_PREFIX` instead of relying on the build id alone.

### 14h. Security

**Implement, then verify.** Most of this is code that has to exist first.

**Headers** — set in `middleware.ts` or `next.config.ts`, verify with
`curl -I https://tavkil.com/en`:

| Header                      | Value                                                  |
| --------------------------- | ------------------------------------------------------ |
| `Content-Security-Policy`   | no `unsafe-eval`; restrict `img-src` to self + R2 host |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`                  |
| `X-Content-Type-Options`    | `nosniff`                                              |
| `X-Frame-Options`           | `DENY` (or CSP `frame-ancestors 'none'`)               |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                      |
| `Permissions-Policy`        | deny camera, microphone, geolocation                   |

**Auth & authorisation:**

- Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax`. Never store session state in `localStorage`.
- A signed-in but **non-allowlisted** Google account must be rejected — test it, don't assume
- **IDOR:** for each `/api/admin/:id` route, call it while signed out and as a lower-privileged
  role. 401/403, never 200.
- Permission checks are the **first line** of each admin handler — grep to confirm none were missed
- Auth endpoints rate-limited

**Injection & input:**

- Drizzle parameterises by default — but audit every `sql\`…\`` template for interpolated
  user input. That's the one place SQL injection can still happen.
- Zod-validate every request body and query param, server-side. Client validation is UX, not security.
- **Reject SVG uploads.** SVG is an XSS vector — it can carry `<script>`. Allow only
  JPEG/PNG/WebP, and sniff the actual bytes, not just the declared MIME type.
- Enforce `MAX_UPLOAD_MB` server-side

**Secrets & exposure:**

- **Audit every `NEXT_PUBLIC_*` var** — that prefix means it is compiled into client
  JavaScript and is public. Currently: site URL, R2 public URL, Turnstile _site_ key.
  All three are meant to be public. Nothing else may ever get that prefix.
- `gitleaks` in pre-commit is already wired — confirm it fires
- Grep the built bundle for `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`:
  ```bash
  grep -rE "postgresql://|GOCSPX-|BETTER_AUTH_SECRET" .open-next/ && echo LEAK
  ```
- `.env`, `.env.production`, `.dev.vars` all gitignored — verify with `git check-ignore`

**Infrastructure:**

- `tavkil-images` is public-read but **not listable**; `tavkil-cache` stays fully private
- No CORS headers on `/api/*` — same-origin only, there is no external consumer
- Cloudflare WAF: enable managed rules, and a rate-limit rule on `/api/contact` and `/api/auth`
- `pnpm audit` clean, or every exception written down with a reason

**The one that matters most:** a price or supplier leak _is_ the security bug for this
project. 14a's leak suite and 14c's view-source pass are the real security tests here.

## 15. Go live

1. Attach `tavkil.com` as a Custom Domain on the Worker
2. Update `.env.production` and the `BETTER_AUTH_URL` secret to the real domain
3. Flip `SITE_INDEXABLE=true`
4. Swap `NEXT_PUBLIC_R2_PUBLIC_URL` to `images.tavkil.com` (r2.dev is rate-limited and
   not for production traffic)
5. Deploy, then re-run **all of step 14** against the real domain — Lighthouse budgets,
   Rich Results, security headers, the full Playwright suite. Scores measured on
   `workers.dev` don't carry over; the domain, caching, and CSP all change.
6. Submit the sitemap in Google Search Console and Bing Webmaster Tools
7. Confirm IndexNow fires on the first real publish

### Definition of done

- [ ] All 6 storefront routes live in EN/TR/AR, RTL correct in AR
- [ ] Zero price or supplier occurrences in any public page's **source**
- [ ] Admin reachable, Google-gated, products/categories/suppliers/media editable
- [ ] Image upload → R2 → renders on the storefront
- [ ] Lighthouse: Perf ≥90, A11y 100, Best Practices ≥95, SEO 100
- [ ] axe: zero WCAG 2.1 AA violations
- [ ] Sitemap has real `lastmod`; Rich Results validates `Product` without `offers`
- [ ] Security headers present; no secrets in the bundle; SVG upload rejected
- [ ] All 11 Playwright flows green against the deployed URL
- [ ] Bundle under 3 MB gzipped
- [ ] Contact form sends a real email end-to-end

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
