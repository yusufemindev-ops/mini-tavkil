'use client';

import { useCallback, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { CategorySort } from '@/components/catalog/category-sort';
import {
  DEFAULT_PRODUCT_SORT,
  parseProductSort,
  type ProductSort,
} from '@/lib/catalog/product-sort';

/**
 * Renders category product grid with client-side sorting synced to the URL,
 * allowing static page caching on the server while supporting sort selection.
 */

/** Custom event to notify subscribers of same-document URL changes via replaceState. */
const SORT_CHANGE = 'tavkil:sortchange';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(SORT_CHANGE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(SORT_CHANGE, onChange);
  };
}

// Reads current sort parameter from URL for client-side store snapshot.
const readSort = () =>
  parseProductSort(new URLSearchParams(window.location.search).get('sort') ?? undefined);

// The prerender has no query string to read.
const serverSort = () => DEFAULT_PRODUCT_SORT;

export type SortableCard = {
  id: string;
  moq: number;
  name: string;
  node: ReactNode;
};

/** Reorders prerendered cards on the client according to selected sort criteria. */
function reorder(cards: SortableCard[], sort: ProductSort, locale: string): SortableCard[] {
  if (sort === DEFAULT_PRODUCT_SORT) return cards;
  // Locale-aware collation for accurate alphabetical sorting across locales.
  const collator = new Intl.Collator(locale);
  const byName = (a: SortableCard, b: SortableCard) => collator.compare(a.name, b.name);
  return [...cards].sort(sort === 'moq' ? (a, b) => a.moq - b.moq || byName(a, b) : byName);
}

export function CategoryListing({
  cards,
  total,
  locale,
}: {
  cards: SortableCard[];
  total: number;
  locale: string;
}) {
  const t = useTranslations('store');
  const sort = useSyncExternalStore(subscribe, readSort, serverSort);
  const ordered = useMemo(() => reorder(cards, sort, locale), [cards, sort, locale]);

  const onChange = useCallback((next: ProductSort) => {
    // Default sort keeps URL query-free for clean canonical URLs.
    const { pathname, hash } = window.location;
    const url = next !== DEFAULT_PRODUCT_SORT ? `${pathname}?sort=${next}${hash}` : pathname + hash;
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new Event(SORT_CHANGE));
  }, []);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground font-mono text-sm">
          {total} {t('cat_results')}
        </p>
        {cards.length > 0 && <CategorySort value={sort} onChange={onChange} />}
      </div>

      <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 lg:grid-cols-4">
        {ordered.map((card) => (
          <div key={card.id} className="contents">
            {card.node}
          </div>
        ))}
      </div>
    </div>
  );
}
