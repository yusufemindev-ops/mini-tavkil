import { Thumb } from '@/components/catalog/thumb';
import { Link } from '@/i18n/navigation';
import type { PublicCategory } from '@/lib/queries/public-product';

// Prototype `.subcat-tile` — image thumb + label. A subcategory is a child
// category, so the tile links to that child's own catalogue page: one canonical,
// crawlable URL per listing, never a query parameter.
export function SubcategoryTile({
  category,
  color = 'var(--primary)',
}: {
  category: PublicCategory;
  color?: string;
}) {
  return (
    <Link
      href={`/catalogue/${category.slug}`}
      className="border-border bg-card hover:border-primary group flex flex-col overflow-hidden rounded-lg border text-start transition-colors"
    >
      <Thumb src={category.imageUrl} color={color} className="aspect-[16/10]" />
      <div className="border-border border-t px-3 pb-3 pt-2.5">
        <div className="text-foreground text-[0.9rem] font-semibold leading-tight">
          {category.name}
        </div>
      </div>
    </Link>
  );
}
