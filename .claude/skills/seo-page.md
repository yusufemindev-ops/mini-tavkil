# Skill: seo-page

SEO is the one area where mini-tavkil is _more_ thorough than Tavkil, not less. The
backend's job is to be a fast structured Knowledge Engine — data in the HTML, for
crawlers and for AI answer engines.

Apply this whenever adding or changing a public page.

## Non-negotiables

1. **Server Components + native `fetch`/direct query.** Never TanStack Query, never
   `useEffect` fetching, on an indexable page. Client-fetched data is invisible to
   crawlers.
2. **Full metadata** via `generateMetadata`: title, description, canonical, `hreflang`
   for all three locales, OG + Twitter tags.
3. **JSON-LD** appropriate to the page type — see below.
4. **Sitemap entry** with a real `lastModified`.
5. **No price, no supplier** — see `public-data-guard`. A `Product` block with `offers`
   is a rule violation, not an oversight.

## JSON-LD per page type

| Page            | Emit                                                            |
| --------------- | --------------------------------------------------------------- |
| Home            | `Organization` + `WebSite` (with `SearchAction`)                |
| Category        | `BreadcrumbList` + `CollectionPage` with `ItemList` of products |
| Product         | `Product` (**no `offers`**) + `BreadcrumbList`                  |
| About / Contact | `Organization`, `ContactPoint` on contact                       |

`Product` fields to include: `name`, `description`, `image` (all of them), `sku`,
`brand`, `category`, `material`/`color` via `additionalProperty` where you have them.

**Why no `offers`:** Google's price and availability rich results require
`offers.price`. We have no public price. Emitting `"price": "0"` or a fake range is
spam and risks a manual action. We forgo the price snippet and win on completeness,
breadcrumbs, and AI answer engines instead.

## hreflang

- One `<link rel="alternate" hreflang>` per locale **that actually has content**
- Never emit an hreflang pointing at an English-fallback URL — those are `noindex`
- Include `x-default`
- Canonical always points at the current locale's own URL, never cross-locale

## Sitemap

`app/sitemap.ts` is generated from the database, not a static list.

- Products + categories × locales, plus the static routes
- **`lastModified` is the row's `updated_at`.** Never `new Date()` — that tells Google
  everything changed on every crawl, and it responds by crawling _less_.
- Emit a locale's URL only when that locale has real content
- `alternates.languages` per entry
- Cached via `revalidate` — one query per revalidation, not per crawl

## IndexNow

Ping on publish/unpublish of any product or category. One POST with
`INDEXNOW_API_KEY`. Covers Bing, Yandex, Naver, Seznam — minutes, not days.

Google does not use IndexNow, and its sitemap ping endpoint was retired in 2023. For
Google the levers are accurate `lastModified`, the sitemap registered once in Search
Console, and internal linking.

## Internal linking

Worth more than any markup. Every product must be reachable in ~3 clicks from the home
page. Category pages should link to their products and to sibling categories. Orphan
products don't get crawled, sitemap or not.

## llms.txt / llms-full.txt

The AEO/GEO play, and the one place a no-price catalog isn't at a disadvantage —
answer engines want structured facts, not offers. Keep `llms-full.txt` covering the
whole catalog: product names, categories, attributes, descriptions. No prices, no
suppliers.

## Checklist

- [ ] Server Component, no client-side data fetching
- [ ] `generateMetadata` with canonical + hreflang (all locales with content) + OG
- [ ] Correct JSON-LD for the page type; `Product` has no `offers`
- [ ] Added to the sitemap with `updated_at` as `lastModified`
- [ ] IndexNow fires if this page's entity can be published
- [ ] Reachable within ~3 clicks of the homepage
- [ ] Verified in rendered HTML — view source, not devtools DOM
