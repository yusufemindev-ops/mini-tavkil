'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { DEFAULT_PRODUCT_SORT, PRODUCT_SORTS, type ProductSort } from '@/lib/catalog/product-sort';

// Labels for the sort values the query layer supports. Keyed off PRODUCT_SORTS so
// adding a sort there without a label here is a type error rather than a blank
// option. There is no price sort: there is no public price to sort by.
const LABEL_KEY: Record<ProductSort, string> = {
  recommended: 'sort_recommended',
  moq: 'sort_moq',
  az: 'sort_az',
};

// Writes `?sort=` on the current category's canonical path. The default view
// stays query-free so the canonical URL is clean. Reads the current value from a
// prop rather than `useSearchParams`, which would force a Suspense boundary.
export function CategorySort({ value }: { value: ProductSort }) {
  const t = useTranslations('store');
  const router = useRouter();
  const pathname = usePathname();

  const onChange = (next: string) => {
    router.replace(next !== DEFAULT_PRODUCT_SORT ? `${pathname}?sort=${next}` : pathname, {
      scroll: false,
    });
  };

  return (
    <label className="text-muted-foreground flex items-center gap-2 text-sm">
      {t('sort_by')}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-input bg-background text-foreground focus-visible:border-primary cursor-pointer rounded-sm border px-2.5 py-1.5 text-sm outline-none"
      >
        {PRODUCT_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t(LABEL_KEY[sort])}
          </option>
        ))}
      </select>
    </label>
  );
}
