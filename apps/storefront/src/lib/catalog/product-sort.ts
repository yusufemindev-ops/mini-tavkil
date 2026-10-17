/**
 * Product sort options — deliberately in their own module.
 *
 * The sort dropdown is a Client Component and needs these values. If it imported
 * them from `lib/queries/public-product`, that module's `import { db }` would be
 * pulled into the browser bundle: Drizzle, the full schema, and a module-scope
 * `throw new Error('DATABASE_URL is not set')` that fires in the browser. That is
 * exactly what happened once — keep client-reachable constants out of any module
 * that touches the database.
 *
 * `recommended` keeps the admin's merchandising order (featured pinned first),
 * which is why it is the default and why it is not called "newest". There is no
 * price sort: there is no public price to sort by.
 */

export const PRODUCT_SORTS = ['recommended', 'moq', 'az'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const DEFAULT_PRODUCT_SORT: ProductSort = 'recommended';

/** Anything unrecognised falls back to the default rather than 404ing. */
export function parseProductSort(value: string | undefined): ProductSort {
  return (PRODUCT_SORTS as readonly string[]).includes(value ?? '')
    ? (value as ProductSort)
    : DEFAULT_PRODUCT_SORT;
}
