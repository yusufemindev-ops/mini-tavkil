import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { DEFAULT_PRODUCT_SORT } from '@/lib/catalog/product-sort';
import type { PublicCategory } from '@/lib/queries/public-product';

// Prototype `.filters` — a carded, single-select list of sibling subcategories.
// Each row is a clean-path LINK to that category's own page, so every listing has
// one canonical, crawlable URL rather than a `?subcategory=` variant of the parent.
//
// Tavkil's version also carried a verified-buyers-only toggle. There are no buyer
// accounts here, so the list is all that remains.
export async function CategoryFilters({
  siblings,
  parentSlug,
  activeSlug,
  sort,
}: {
  siblings: PublicCategory[];
  /** The top-level category — the "All" target. */
  parentSlug: string;
  activeSlug: string;
  sort: string;
}) {
  const t = await getTranslations('store');
  // Carry a non-default sort across filter navigation; the default view keeps a
  // clean canonical URL.
  const suffix = sort !== DEFAULT_PRODUCT_SORT ? `?sort=${sort}` : '';

  if (siblings.length === 0) return null;

  return (
    <aside className="border-border bg-card top-[calc(var(--height-nav)+1rem)] rounded-lg border p-3.5 lg:sticky">
      <h2 className="text-muted-foreground mb-2 px-[11px] text-[0.72rem] font-bold uppercase tracking-wide">
        {t('cat_type')}
      </h2>
      <div className="flex flex-col gap-0.5">
        <FilterRow
          label={t('sub_all')}
          href={`/catalogue/${parentSlug}${suffix}`}
          active={activeSlug === parentSlug}
        />
        {siblings.map((category) => (
          <FilterRow
            key={category.id}
            label={category.name}
            href={`/catalogue/${category.slug}${suffix}`}
            active={activeSlug === category.slug}
          />
        ))}
      </div>
    </aside>
  );
}

function FilterRow({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-md px-[11px] py-[9px] text-start text-[0.9rem] leading-snug transition-colors',
        active
          ? 'bg-primary-soft text-primary-ink font-semibold'
          : 'text-foreground-soft hover:bg-background-2 hover:text-foreground',
      )}
    >
      <span>{label}</span>
    </Link>
  );
}
