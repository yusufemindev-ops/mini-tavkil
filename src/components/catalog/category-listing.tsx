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
 * The results header and the product grid, with sorting done in the browser.
 *
 * Sorting used to be a server concern: the page read `?sort=` from `searchParams`
 * and asked Postgres for that order. It was correct and it cost the whole page
 * its cache — touching `searchParams` anywhere in a route opts that route into
 * dynamic rendering, so every category URL answered
 * `Cache-Control: private, no-cache, no-store` and every crawler hit re-ran the
 * query. Category pages are the second-most-crawled type on the site, so that is
 * the wrong page to make uncacheable for a control most visitors never touch.
 *
 * The server now always renders the recommended order — the canonical view, the
 * one in the sitemap, the one Google indexes — and the page is static again. The
 * cards arrive already rendered as `node`, so `ProductCard` stays a Server
 * Component and nothing about the markup moves into the client bundle; this
 * component only decides what order to place them in.
 *
 * `sort` lives in the URL and is read with `useSyncExternalStore`, not
 * `useSearchParams` — the latter bails the whole subtree out of the prerender and
 * would put a fallback in the HTML where the products should be. The server
 * snapshot is the default sort, so the prerendered markup is the recommended
 * order; the browser re-reads the real query immediately after hydrating, which
 * is what makes a deep link to `?sort=moq` land sorted.
 *
 * The URL is written with `history.replaceState` rather than the Next router.
 * Nothing on the server depends on `?sort=` any more, so a router navigation
 * would refetch an RSC payload only to render markup identical to what is already
 * on screen. `replaceState` is synchronous and free; the custom event is how this
 * store learns about a change it made itself, since `replaceState` — unlike Back
 * and Forward — fires no `popstate`.
 */

/** Same-document URL writes fire no `popstate`, so announce them explicitly. */
const SORT_CHANGE = 'tavkil:sortchange';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(SORT_CHANGE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(SORT_CHANGE, onChange);
  };
}

// Returns one of three string literals, so it is referentially stable across
// calls — which `useSyncExternalStore` requires of a snapshot.
const readSort = () =>
  parseProductSort(new URLSearchParams(window.location.search).get('sort') ?? undefined);

// The prerender has no query string to read.
const serverSort = () => DEFAULT_PRODUCT_SORT;

export type SortableCard = {
  id: string;
  /** Sort keys, mirroring `orderFor()` in the query layer exactly. */
  moq: number;
  name: string;
  node: ReactNode;
};

/**
 * Mirrors `orderFor()` in `lib/queries/public-product.ts`. `recommended` is the
 * order the server sent, so it is the identity — keep it that way rather than
 * re-deriving it, because it encodes the admin's manual `sortOrder`, which is
 * deliberately not part of the public shape.
 */
function reorder(cards: SortableCard[], sort: ProductSort, locale: string): SortableCard[] {
  if (sort === DEFAULT_PRODUCT_SORT) return cards;
  // Locale-aware so Turkish "ı/i" and Arabic collate the way a reader expects,
  // which a plain `<` comparison on UTF-16 code units does not.
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
    // The default view stays query-free so the canonical URL is clean.
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
