# Skill: public-data-guard

The most important rule in this repo. Prices and suppliers never reach the public.

## The rule

`price` (any form: base, unit, cost) and `supplier` are **admin-only**. They never appear in:

- Any page, component, or route handler reachable without an admin session
- `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`
- JSON-LD — `Product` is rendered **without `offers`**
- Error responses, including `details` and stack traces
- HTML comments, `data-*` attributes, or serialized RSC payloads

Note the last one. A field can leak without being _displayed_ — if a Server Component
receives an object containing `price` and passes it to a Client Component, that value is
serialized into the HTML payload and is trivially readable. **Strip at the query, not at
the render.**

## How it's enforced

One file: `lib/queries/public-product.ts`.

```ts
// The only product shape public pages may render.
// No price field. No supplier field. Not optional — absent.
export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  images: PublicImage[];
  category: { slug: string; name: string };
  attributes: { label: string; value: string }[];
};

export async function publicProduct(slug: string, locale: Locale): Promise<PublicProduct | null>;
export async function publicProducts(filter: PublicFilter): Promise<PublicProduct[]>;
```

Because the type has no such keys, a leak is a **compile error**.

## When writing code

- Public page needs product data → call `publicProduct` / `publicProducts`. Nothing else.
- Need a new field publicly → add it to `PublicProduct` deliberately, in that file, and
  ask whether it's genuinely public.
- Never `select` price or supplier in a query reachable from a public path
- Never widen the return type "temporarily"
- Never `as any` or spread a raw Prisma result into a public response
- Admin queries live in `lib/queries/admin-*.ts` and are only called from
  `/api/admin/*` handlers behind the session guard

## When reviewing

Grep the diff for `price`, `base_price`, `unit`, `supplier`, `cost`. For each hit ask:
_can a logged-out visitor reach this code path?_ If yes or unsure, it's a finding.

Check RSC boundaries specifically: a Client Component prop is public data even if it's
never rendered.

## Tests

`TESTING.md` §1 defines the public-leak suite. Every public route handler and page data
function asserts no `price` / `supplier` key exists anywhere in the returned object,
including nested. Playwright flow 2 asserts the same against rendered HTML.

Types catch it at build. Vitest catches a widened type. Playwright catches a render-side
mistake. Keep all three.

## What this replaces

Tavkil's three-DTO discipline (`PublicProductDto` / `BuyerProductDto` /
`AdminProductDto`) existed because logged-in buyers saw tier-derived prices. **There are
no buyers here.** Two audiences: anonymous and admin. Do not reintroduce the DTO split.
