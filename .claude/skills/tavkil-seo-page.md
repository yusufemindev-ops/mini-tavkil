---
name: tavkil-seo-page
description: Enforces Tavkil's SEO/GEO/AEO Knowledge Engine rules on public storefront pages (Next.js Server Components, generateMetadata with canonical and completed-locale hreflang, JSON-LD Product without offers, real updated_at in sitemap.ts, IndexNow pings, and llms.txt). Use whenever adding or modifying a public storefront page.
---

# Skill: tavkil-seo-page

The backend's job for SEO/GEO/AEO is to be a **fast structured Knowledge Engine** — delivering complete data directly in the server-rendered HTML for search crawlers and AI answer engines.

Apply this whenever adding or modifying a public storefront page.

## Non-negotiables

1. **Server Components + direct query / native `fetch`.** Never use TanStack Query or `useEffect` data fetching on a public, indexable page. Client-fetched data is invisible to crawlers. (TanStack Query is only used on authenticated `noindex` buyer pages and the Admin SPA.)
2. **Full metadata** via `generateMetadata`: localized title, description, self-referencing canonical, `hreflang` for all locales with complete content (`en`, `tr`, `ar`) + `x-default`, Open Graph, and Twitter tags.
3. **JSON-LD** appropriate to the page type — see below.
4. **Sitemap entry** (`src/app/sitemap.ts`) with the database row's real `updated_at` as `lastModified`.
5. **No price, no supplier** on anonymous pages — see `public-data-guard`. A `Product` JSON-LD block with `offers` is a rule violation.
6. **Incomplete or machine-translated rows get `noindex`:** Pages where `is_complete = false` or `is_machine_translated = true` must emit `robots: { index: false }` until reviewed by a human.

## JSON-LD per page type

| Page            | Emit                                                            |
| --------------- | --------------------------------------------------------------- |
| Home            | `Organization` + `WebSite` (with `SearchAction`)                |
| Category        | `BreadcrumbList` + `CollectionPage` with `ItemList` of products |
| Product         | `Product` (**no `offers`**) + `BreadcrumbList`                  |
| About / Contact | `Organization`, `ContactPoint` on contact                       |

`Product` fields to include: `name`, `description`, `image` (all gallery URLs), `sku`, `brand`, `category`, and `additionalProperty` for attributes.

**Why no `offers`:** Google's price and availability rich results require `offers.price`. Anonymous pages have no public price. Emitting `"price": "0"` or a fake range is spam and risks a manual action. We compete on structured attribute completeness, breadcrumbs, and AI answer engine citations instead.

## hreflang

- Emit one `<link rel="alternate" hreflang>` per locale **that actually has complete content** (`isComplete = true`).
- Never emit an `hreflang` pointing at an incomplete or fallback URL.
- Include `x-default`.
- Canonical always points at the current locale's own URL, never cross-locale.

## Sitemap

`src/app/sitemap.ts` is generated dynamically from the database:

- Published products + categories × completed locales, plus static routes.
- **`lastModified` comes from the row's `updated_at`.** Never `new Date()`.
- `alternates.languages` per entry.

## IndexNow

Ping on publish/unpublish of any product or category (`src/lib/seo/indexnow.ts` / `ping.ts`) using `INDEXNOW_API_KEY`. Covers Bing, Yandex, IndexNow-participating engines, and Copilot citations.

## Internal linking

Every published product must be reachable within ~3 clicks of the homepage. Category pages link to their products and sibling categories so crawlers never hit orphan pages.

## llms.txt & llms-full.txt

Served by `src/app/llms.txt/route.ts` and `src/app/llms-full.txt/route.ts` for GEO/AEO answer engines: structured catalog facts (product names, categories, attributes, MOQs, descriptions) with zero prices and zero supplier identities.

## Checklist

- [ ] Server Component, no client-side data fetching on indexable pages
- [ ] `generateMetadata` with canonical + `hreflang` (completed locales) + OG
- [ ] Correct JSON-LD for the page type; `Product` has no `offers`
- [ ] Included in `src/app/sitemap.ts` with `updated_at` as `lastModified`
- [ ] IndexNow fires when the entity is published
- [ ] Reachable within ~3 clicks of the homepage
- [ ] Verified in rendered HTML source
