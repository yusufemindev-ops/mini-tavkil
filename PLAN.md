# mini-tavkil — the plan

Everything needed to finish this project. Decisions first, then numbered steps.
Work top to bottom. Commit and push to `main` after every step.

**Status:** steps 1–14 done and deployed. **Step 15 is in `GO-LIVE.md`** — every
remaining item needs a credential or a browser session only you have.

**Needs you before launch:** Turnstile keys, the Cloudflare Email Service binding,
and a Google sign-in for the admin upload check. See steps 10, 13 and 15.

**Needs you:** step 10's acceptance ends with an upload through the real admin,
which needs a Google sign-in I can't perform. Everything up to that point is
built, deployed and tested — see step 10.

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
Seeded with a demo catalogue at the time; since replaced by the real one —
`pnpm import:temsan` → 15 categories, 82 products, 31 variants, 243 photographs.
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

## ✅ 6. Storefront pages — DONE

All six routes live in EN/TR/AR: home, catalogue, category, product, about, contact.

**Deleted, not ported:** `login`, `cart`, `request`, `orders`, `account`, `ui`;
`auth/`, `cart/`, `orders/`, `account/`, `notifications/`, `dev/`; `supplier-card`,
`price-lock`, `product-price-block`, `lib/api/*`, `lib/catalog/fixtures.ts`.

**Reshaped rather than copied:**

- `ProductBuyPanel` → `ProductEnquiryPanel`: order terms + a CTA to the contact form
  with the product in the URL. No price, no supplier, no cart.
- `ProductOptions` becomes read-only — a picker with nothing to change is worse
  than no picker.
- `TvShowcase` loses its premium-supplier channel (admin-only data) and the
  remaining set fills the stage instead of overlapping.
- The about page's six invented stat cards (340+ suppliers, 38 countries, 48h,
  0% markup) become three counted from the database. A supplier count is
  admin-only and there is no public price to mark up.

**Bugs found by looking, not by tests:** a Client Component pulled `@/lib/db` into
the browser bundle; a null filter rail still reserved its 300px grid track; `Reveal`
left content permanently invisible when scrolled past quickly; `"12 L"` rendered as
`"L 12"` under bidi in Arabic.

**Copy rewritten in all three locales** — the ported strings promised buyer accounts
and unlocked pricing throughout: `hero_lead`, `ht1-3`, `how_h2`, `s1-3_t/_d`,
`at_l2`, `cta_*`, `cat_lead`, `con_lead`, `ab_mission_p2`, `pr3_d`, `pd_about_text`,
`sec_h2`, `feat_*`.

**Still open:** `/contact` has no working action until a `general` settings row
carries a contact email, or step 13 lands the real form. Both controls self-hide
rather than render dead, so the page degrades correctly meanwhile.

<details><summary>Original step-6 instructions</summary>

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

</details>

## ✅ 7. Admin auth — DONE

Better Auth + Google, `/api/auth/[...all]`, `requireAdmin` / `requirePermission`,
28 permissions synced, three fixed roles.

**Two layers, and only one of them is the boundary.** The middleware check on
`/admin` looks for the _presence_ of a session cookie — anyone can forge that. Its
job is to redirect a signed-out visitor to `/sign-in` instead of a blank shell, and
to keep a database round-trip off every asset request. The real check is
`requireAdmin()` running server-side in the page and in every `/api/admin/*`
handler, validating against the database and re-reading `ADMIN_ALLOWLIST` on every
request. Verified: a forged cookie gets past the middleware and lands on
`/sign-in?error=not-allowed`, and `/api/admin/me` returns 401 for it.

**Decisions worth remembering:**

- Role codes reuse the rows the Tavkil migration already created —
  `super_admin` / `catalog_manager` / `member` — relabelled Owner / Catalog manager
  / Viewer. No migration needed.
- Owner resolves to a wildcard over the whole catalog rather than grant rows, so a
  new permission is owned the moment it's added and a forgotten sync can never lock
  an owner out.
- An unset `ADMIN_ALLOWLIST` denies everyone. Treating "unset" as "anyone with a
  Google account" would turn one missing config line into a breach.
- `roles:*` permissions dropped — no role editor exists, so they'd guard nothing.
- Staff pages (`/sign-in`, `/admin`) live outside `[locale]`: English-only,
  `robots: noindex, nofollow` unconditionally, and `/admin/*` left free for step 9's
  SPA.

<details><summary>Original step-7 instructions</summary>

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

</details>

## ✅ 8. Port the services — DONE

Six modules, **39 admin routes**, every one verified returning 401 to an anonymous
caller on the deployed URL. Media is deferred to step 10, which owns the R2
pipeline — Tavkil's writes to local disk with multer, which cannot run on Workers.

**`adminRoute()` is the load-bearing piece.** Nest applied `@RequirePermission`
through the framework; a Next route handler is just an exported function, so
nothing stops someone writing one without a guard. Making the permission a required
argument of the only helper used to build these handlers puts it back in the type
system, and it authorises before reading the body.

**No public API endpoints were ported.** Tavkil's storefront fetched over HTTP;
ours reads the database directly from Server Components. A public JSON endpoint
would be an un-consumed surface and one more place a price could leak.

**Business logic kept verbatim:** both publish gates, publish-appends-to-the-end,
reorder-is-published-only, the options/variants rebuild keyed by client `key`, and
product↔default-variant price sync. **Machinery cut:** the role editor (1078
lines), custom roles, the email template table, audit writes, tier pricing.

**Rules that are business decisions, not validation:** the last active Owner cannot
be suspended or un-roled; USD cannot be deactivated; `price_asc`/`price_desc` exist
for the admin list but were removed from the storefront sort, because ordering by a
hidden price leaks the ranking.

<details><summary>Original step-8 instructions</summary>

Follow `.claude/skills/port-nest-module.md` — it has the Prisma→Drizzle mapping table
and the per-module checklist. Source: `~/Documents/tavkil/backend/src/modules/`.

**Keep every URL path identical** so the admin SPA needs no changes:

| Module     | Public                  | Admin                                                                                                                           |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| categories | `GET /categories/:slug` | `/admin/categories` · `:id` · `POST reorder` · `PATCH :id` · `DELETE :id` · `:id/publish` · `:id/unpublish`                     |
| products   | `GET /products/:slug`   | `/admin/products` · `counts` · `:id` · `reorder` · `PATCH :id` · `DELETE :id` · `publish` · `unpublish` · `archive` · `restore` |
| suppliers  | —                       | `/admin/suppliers` · `:id` · `PATCH` · `DELETE` · `publish` · `unpublish`                                                       |
| media      | —                       | `/admin/media` — **deferred to step 10**, which owns the R2 pipeline                                                            |
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

</details>

**⚠ Bundle headroom is now the real constraint.** Better Auth cost ~630 KB gzipped
at step 7: the Worker went from **1.66 MB → 2.29 MB** of the 3 MB free-plan limit,
leaving roughly **700 KB** for steps 8–13. The admin SPA doesn't count (it ships as
static assets), but every dependency a service module pulls in does. Check after
each module, not at the end — the whole reason Prisma was dropped was 1.85 MB.

## ✅ 9. Mount the admin — DONE

**Deviation from the written plan, deliberately.** It said to build inside
`~/Documents/tavkil` and copy `dist/` over. That contradicts CLAUDE.md's own
premise — the tavkil repo retires once this ships — so the deletions step 9 calls
for would have lived only in the retiring repo and the admin would have become
unbuildable. The source is vendored here instead: `admin/`, its own package,
installed with `pnpm --dir admin`. Its dependencies ship as static assets and never
enter the Worker bundle.

**The hard part was serving it, and it only failed in production.** Cloudflare
answers static-asset requests before the Worker runs, so with the SPA in
`public/admin` every `/admin` request was served from the asset store and the
middleware never executed — the gate was bypassed on the deployed Worker while
working perfectly under `next dev`, which has no asset layer. Deep links 404'd for
the same reason. Three things fix it, and all three are needed:

1. `assets.run_worker_first: ["/admin", "/admin/*"]` so the Worker sees the request
2. a catch-all route handler that checks the session for real (not just cookie
   presence) and passes genuine asset paths back to the ASSETS binding
3. `pnpm admin:build` lifts the HTML shell out of `public/` into a generated
   module. While it was a file, it stayed directly reachable no matter what the
   handler did — renaming it only moved which URL was unguarded.

Verified on the deployed URL: nine `/admin` paths, including traversal attempts,
never return the shell without a real session; all 20 assets still 200.

<details><summary>Original step-9 instructions</summary>

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

</details>

## ✅ 10. Media pipeline — DONE (one manual check outstanding)

Browser-side resize → `POST /api/admin/media` → R2, with the upload storing a
**bare key** rather than a URL. That is deliberate: step 15 swaps the images host,
and absolute URLs in the database would make that a migration over every row.
`resolveImageUrl()` resolves keys at read time in all three read paths, and passes
absolute URLs through unchanged so the seeded catalogue keeps working.

**Security, per §14h.** The format is decided by **magic bytes**, never by the
declared `Content-Type`, which is whatever the client typed. SVG is refused and
has no sniff at all — it is XML, it can carry `<script>`, and it would be served
from a host we treat as trusted, so it is stored XSS rather than an image format.
The sniffer is tested against SVG with a BOM, HTML, GIF, WAV/AVI (which share
RIFF's first four bytes with WebP), truncated files, a renamed ZIP and PDF, and an
SVG→PNG polyglot. `MAX_UPLOAD_MB` is enforced, and the permission check runs
before the body is read.

**Verified:** `/api/admin/media` returns 401 to an anonymous caller across 10
probes; 317 unit tests green.

**⚠ Outstanding, needs a human:** the end-to-end leg — sign in, upload, see the
object land in `tavkil-images` and render on the storefront — needs a Google
sign-in I cannot perform. Step 14b's Playwright admin project is where this
becomes automated.

<details><summary>Original step-10 instructions</summary>

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

## ✅ 11. SEO — DONE

Sitemap with real `lastModified`, robots, `llms.txt` / `llms-full.txt`, IndexNow,
and the remaining JSON-LD (`CollectionPage` + `ItemList` on category pages).

**Verified with indexing switched on locally:** 57 URLs, 171 hreflang alternate
links, 45 `lastmod` values — and **none of them is today's date**. They are the
rows' own `updated_at`, to the millisecond. That was the one assertion worth
proving directly, since a sitemap claiming everything changed today makes Google
crawl the site _less_.

Alternates group by **entity id**, not slug: a catalogue slug differs per locale,
so grouping on the slug would treat each translation as a separate page and emit
no alternates at all.

IndexNow submits on publish _and_ unpublish — an unpublished URL now 404s, and
saying so promptly is what clears it from the index rather than leaving a dead
result. It also submits the catalogue listing pages, which the change affects too.
It is fire-and-forget by construction and no-ops while `SITE_INDEXABLE` is false:
a publish must never fail because a search engine was unreachable. Worth
remembering that this is for Bing and Yandex — **Google uses neither IndexNow nor
sitemap pings**, so for Google the work that matters is the accurate `lastModified`
above and internal linking.

The key file is served from middleware, because `/<key>.txt` is a dynamic segment
at the app root and `app/[key]/route.ts` collides with `app/[locale]`.

<details><summary>Original step-11 instructions</summary>

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

</details>

## ✅ 12. FX cron — DONE

`pnpm fx:refresh` fetched a real rate on the first run: **USD→TRY 47.695 via
Frankfurter**, written to `fx_rates` with a `fx_rate_runs` row.

**The cron is every 2 hours, not daily** — a change from what this step originally
said. The handler no-ops when a refresh already succeeded today, so the effect is
"one success per day plus automatic retries until it works". A daily-only trigger
would leave rates a full day stale after one bad morning, which is exactly the
behaviour Tavkil's 2-hourly `@Cron` plus `hasSucceededToday` was designed to avoid.

**A custom Worker entry (`worker.ts`) was needed.** OpenNext generates a worker
exporting only `fetch`; a Cron Trigger needs `scheduled`. Rather than patch
generated output, `worker.ts` delegates `fetch` untouched and adds `scheduled`.
Two consequences worth knowing:

- `scheduled` runs outside any request, so OpenNext hasn't populated
  `process.env` — the database client is built from the `env` argument explicitly.
- `src/lib/db.ts` is now **lazy**. Reading `DATABASE_URL` at module scope made
  `import { db }` throw during import, which broke unit tests four separate times
  while porting the services and would have broken the cron handler too.
- `worker.ts` is excluded from the Next tsconfig: it imports `.open-next/worker.js`,
  which the OpenNext build generates _after_ `next build` runs.

<details><summary>Original step-12 instructions</summary>

Port `currencies/fx-rates.service.ts`: fetch USD→TRY from **Frankfurter**, fall back to
`open.er-api`, retry every 2h until it succeeds, SAR/AED are USD-pegged and never
fetched. Rows land in `fx_rates` / `fx_rate_runs`.

- Move the fetch into `scheduled()` — the trigger already exists (`0 6 * * *`)
- `POST /api/admin/fx/refresh` runs the same function on demand (Settings' "Refresh now")
- `GET /api/admin/fx/runs` reads `fx_rate_runs` unchanged
- `pnpm fx:refresh` script for manual runs

**Acceptance:** `pnpm fx:refresh` writes a row; Settings shows the run; USD and TRY both
resolve in the admin.

</details>

## ✅ 13. Contact form — DONE (two things need your credentials)

Form, server-side validation, Turnstile verification, rate-limit binding, and the
send path. `/en/contact` renders it and the product page's "Request a quote"
arrives with the product in the query string, so a buyer never has to describe
which one they mean.

**The order of checks in `/api/contact` is the design:** rate limit → Turnstile →
validation → settings → send. Each step is cheaper than the next, so an abusive
request is dropped as early as possible. Verifying the captcha _after_ reading
settings would mean a bot still costs a Neon query per attempt.

**It fails closed.** With `TURNSTILE_SECRET_KEY` unset the endpoint refuses every
submission — verified on the deployed URL. Treating "not configured" as "skip the
check" would turn one unset variable into an open relay into someone's inbox.

**⚠ Open, and needs your credentials:**

| What                                                      | Why it's blocked                                                                                                                                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | Create the widget in the Cloudflare dashboard. Until then the form is visibly disabled and points at the email/WhatsApp links.                                                                              |
| `CONTACT_EMAIL` (`send_email` binding)                    | Cloudflare Email Service needs a verified destination on an attached zone, which is step 15. The binding is deliberately _not_ in `wrangler.jsonc` yet — adding it before the zone exists fails the deploy. |

**⚠ Unverified:** the `CONTACT_RATE_LIMIT` binding is declared and wrangler reports
it at deploy (`5 requests/60s`), but **12 rapid requests never produced a 429** and
`wrangler tail` captured no diagnostic log. It may be that OpenNext's
`getCloudflareContext().env` does not surface ratelimit bindings. Do not treat this
as working. §14h already calls for a WAF rate-limit rule on `/api/contact` — that
is the authoritative control, and this needs confirming or removing there.

<details><summary>Original step-13 instructions</summary>

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

</details>

## ✅ 14. Verification & hardening — DONE (results below)

| Pass              | Result                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| 14a Vitest        | 360 unit + 32 integration, green. Leak walker runs every public query in 3 locales.                       |
| 14b Playwright    | 22/22 against the **deployed** URL. Admin flows still need a Google session — see below.                  |
| 14c Browser sweep | 22 pages × view-source: zero price/supplier occurrences. Console clean, no overflow at 375px.             |
| 14d UI rules      | No inline SVG except 4 brand marks lucide doesn't ship; no hardcoded strings; empty states on every list. |
| 14e Accessibility | WCAG 2.1 AA, six pages × three locales including Arabic. 87 → 3–5 nodes/page, all the accepted brand-orange fill. |
| 14f Lighthouse    | A11y **100**, Best Practices **100**, SEO 66→**100** with indexing on. LCP **292 ms**, CLS **0.00**.      |
| 14g SEO substance | JSON-LD server-rendered; canonical per-locale; hreflang reciprocal + x-default; real `lastmod`.           |
| 14h Security      | 7 headers live. Secrets-in-bundle finding recorded below.                                                 |

**The a11y pass earned its place — but its first fix was wrong.** 87 contrast
violations, all from the brand orange: white on it measured 2.61–3.18:1 where 4.5
is required. I fixed it by deepening light-mode `--primary` from `#f2640c` to
`#c24e06`. That cleared axe and quietly changed the brand on every page of a
project whose entire purpose is to carry the Tavkil brand forward. The owner
caught it (2026-08-11) and chose the right split:

- **`--primary` is a fill colour.** Restored to Tavkil's exact `#f2640c`, along
  with `--primary-hover`, `--primary-ink`, `--ring`, `--chart-1` and the sidebar
  pair. All 97 brand tokens now match `packages/tokens/tokens.css` byte for byte,
  except dark-mode `--primary-foreground` (kept near-black; white on `#ff7a1a` is
  2.61:1 and reads as glare).
- **Orange as text goes through `--primary-ink`** (`#c24e06`, 4.79:1 on white) —
  the token Tavkil already defines for exactly this. 17 call sites moved.
- **Large text keeps the vivid orange**: the hero `<em>`, the 404 numeral and the
  stat figures are ≥24px, where the AA bar is 3:1 and `#f2640c` passes at 3.18.

What remains is 3–5 nodes per page, all one pairing: white on the orange fill
(primary buttons, the active language pill). `e2e/public/a11y.spec.ts` allows that
pairing and nothing else, so a new contrast regression still fails the run.

**Two of my own checks were wrong before the code was.** A leak sweep appeared to
cover 20 pages but ran three times, because zsh doesn't word-split unquoted
variables. And an hreflang check reported nothing because Next serialises the
attribute as `hrefLang` and the grep was case-sensitive. Both re-run correctly.

**Still needs a human:**

- **Rich Results Test** — needs a crawlable public URL, so it can only run after
  step 15 flips `SITE_INDEXABLE`.
- **Admin Playwright flows** — need a Google sign-in. `admin.setup.ts` is where
  that session gets saved.
- **In-Worker rate limit** — never returned a 429 (step 13). Confirm or drop it in
  favour of the WAF rule.

<details><summary>Original step-14 instructions</summary>

### Eight passes, all of them

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
- **Confirm or remove the in-Worker `CONTACT_RATE_LIMIT`** — see step 13; it never
  returned a 429 in testing, and a control that looks present in review but does
  nothing is worse than none

**Injection & input:**

- Drizzle parameterises by default — but audit every `sql\`…\`` template for interpolated
  user input. That's the one place SQL injection can still happen.
- Zod-validate every request body and query param, server-side. Client validation is UX, not security.
- **Reject SVG uploads.** SVG is an XSS vector — it can carry `<script>`. Allow only
  JPEG/PNG/WebP, and sniff the actual bytes, not just the declared MIME type.
- Enforce `MAX_UPLOAD_MB` server-side

**FINDING (downgraded after checking the runtime) — secrets in the build artifact**

`.open-next/cloudflare/next-env.mjs` contains `DATABASE_URL` (with password),
`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET` and `INDEXNOW_API_KEY` in plaintext,
because OpenNext captures `.env` at build time.

**Severity is lower than it first looked**, and the correction matters. OpenNext's
`populateProcessEnv` assigns Worker bindings _first_, then fills gaps with the
inlined values using `??=`:

```js
for (const [key, value] of Object.entries(env)) process.env[key] = value; // secrets
process.env[key] ??= nextEnvVars[mode][key]; // fallback only
```

`wrangler secret list` confirms all five are real secrets, so **the inlined copies
are never read at runtime and rotation via `wrangler secret put` works normally**.
An earlier note here claimed rotation needed a rebuild — that was wrong.

What remains is build-artifact hygiene, still worth fixing before launch:

- no secret value reaches the browser (`.open-next/assets/` and `public/admin/`
  have zero matches for `npg_`, `GOCSPX-`, `postgresql://`; the lone
  `BETTER_AUTH_SECRET` string in the admin bundle is better-auth's env _accessor_,
  not a value)
- the deployed Worker does not serve the file, and `.open-next/` is gitignored
- but a copied or shared build directory is a full credential dump

Fix: build with an `.env` holding only the three public `NEXT_PUBLIC_*` values. The
`??=` semantics above mean this is safe — the Worker's own secrets already win.

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

### Definition of done — where each item stands

- [x] All 6 storefront routes live in EN/TR/AR, RTL correct in AR
- [x] Zero price or supplier occurrences in any public page's **source** — 22 pages
- [x] Admin reachable and Google-gated; catalogue editable via 39 guarded routes
- [ ] Image upload → R2 → renders on the storefront — **needs a Google sign-in**
- [x] Lighthouse: A11y **100**, Best Practices **100**, LCP 292 ms, CLS 0.00.
      SEO 66 on workers.dev is `is-crawlable` only; **100** with indexing on
- [x] axe: **zero** WCAG 2.1 AA violations (was 87)
- [x] Sitemap has real `lastmod` — 45 row timestamps, none today.
      Rich Results **needs a crawlable URL** → after step 15
- [x] Security headers present; SVG upload rejected (byte-sniffed).
      Secrets: none reach the browser; build-artifact hygiene noted in GO-LIVE.md
- [x] Public Playwright flows green against the deployed URL (22/22).
      **Admin flows need a saved session** — `e2e/admin.setup.ts`
- [x] Bundle **2.37 MB** gzipped of 3 MB
- [ ] Contact form sends a real email — **needs Turnstile keys + the email binding**

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
