import { LOCALE_ORDER, pickTranslation } from '@/features/categories/translations';
import type { AdminProduct } from './queries';

// Pure product-list filtering, extracted from the page so it can be unit-tested.

export type StatusFilter = 'all' | 'draft' | 'published' | 'archived' | 'missing';

/** A product is "missing translations" if any locale isn't complete. */
export function hasMissingTranslation(p: AdminProduct): boolean {
  return LOCALE_ORDER.some((code) => !p.translations.find((t) => t.locale === code)?.isComplete);
}

/**
 * The supplier filter's initial value, read from the `?supplier=` URL param.
 * Defaults to `'all'` when the param is absent (e.g. a plain /products visit),
 * so the Suppliers "View products" deep link (/products?supplier=<id>) lands
 * pre-filtered while a normal visit shows every supplier.
 */
export function initialSupplierFilter(param: string | null): string {
  return param ?? 'all';
}

export interface ProductQuery {
  status: StatusFilter;
  search: string;
  /** 'all' or a category id. */
  category: string;
  /** 'all' or a supplier id. */
  supplier: string;
}

/** Apply the status pill + category/supplier selects + free-text search. */
export function filterProducts(products: AdminProduct[], q: ProductQuery): AdminProduct[] {
  const needle = q.search.trim().toLowerCase();
  return products.filter((p) => {
    if (q.status === 'missing' && !hasMissingTranslation(p)) return false;
    if (q.status !== 'all' && q.status !== 'missing' && p.status !== q.status) return false;
    if (q.category !== 'all' && p.category?.id !== q.category) return false;
    if (q.supplier !== 'all' && p.supplier?.id !== q.supplier) return false;
    if (needle) {
      const name = pickTranslation(p.translations)?.name ?? '';
      const haystack = `${name} ${p.sku ?? ''} ${p.supplier?.name ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}
