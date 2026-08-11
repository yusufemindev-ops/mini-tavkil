import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { CategoryIcon } from '@/components/icons';
import { Thumb } from '@/components/catalog/thumb';
import { Link } from '@/i18n/navigation';
import type { PublicCategory } from '@/lib/queries/public-product';

/**
 * Prototype `.cat` — category directory tile.
 *
 * Tavkil looked its label and icon up from a fixed six-category enum
 * (`t('${category.id}_t')`, `CATEGORY_ICONS[id]`). Categories here are database
 * rows an admin creates, so the name and description come from the row's
 * translation and the visual comes from the row's own `imageUrl`, falling back to
 * the brand-gradient tile. No enum to keep in sync.
 */
export function CategoryTile({
  category,
  productCount,
}: {
  category: PublicCategory;
  productCount?: number;
}) {
  const t = useTranslations('store');

  return (
    <Link
      href={`/catalogue/${category.slug}`}
      className="border-border bg-card hover:border-primary group relative flex gap-4 rounded-lg border p-5 transition-colors"
    >
      {category.imageUrl ? (
        <Thumb src={category.imageUrl} className="size-[50px] flex-none rounded-lg" />
      ) : (
        <div className="bg-primary-soft text-primary-ink group-hover:bg-primary grid size-[50px] flex-none place-items-center rounded-lg transition-colors group-hover:text-white">
          <CategoryIcon hint={`${category.slug} ${category.name}`} className="size-6" />
        </div>
      )}
      <div className="min-w-0 flex-1 pe-6">
        <h3 className="text-foreground mb-1 text-[1.12rem] font-bold">{category.name}</h3>
        {category.description && (
          <p className="text-muted-foreground text-[0.85rem] leading-snug">
            {category.description}
          </p>
        )}
        {productCount !== undefined && (
          <span className="text-primary-ink mt-2.5 inline-flex items-center gap-1.5 font-mono text-[0.78rem] font-semibold">
            {productCount.toLocaleString()} {t('skus')}
          </span>
        )}
      </div>
      <ArrowRight
        aria-hidden
        className="text-muted-foreground group-hover:text-primary absolute end-5 top-5 size-4 transition-all group-hover:translate-x-0.5 rtl:rotate-180"
      />
    </Link>
  );
}
