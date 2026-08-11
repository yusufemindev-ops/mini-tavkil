import { useTranslations } from 'next-intl';
import { Thumb } from '@/components/catalog/thumb';
import { Link } from '@/i18n/navigation';
import type { PublicProduct } from '@/lib/queries/public-product';

/**
 * Prototype `.card` — product tile.
 *
 * Tavkil's version had a price slot that showed either the buyer's tier price or a
 * "sign in to see price" lock. Neither exists here: `PublicProduct` has no price
 * field at all, so the footer carries the MOQ and the unit — the two facts a buyer
 * actually needs before enquiring.
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: PublicProduct;
  priority?: boolean;
}) {
  const t = useTranslations('store');
  const primary = product.images[0];

  return (
    <Link
      href={`/product/${product.slug}`}
      className="border-border bg-card hover:border-primary group flex flex-col overflow-hidden rounded-lg border transition-colors"
    >
      <Thumb
        src={primary?.url}
        // The heading below names the product, so the thumbnail is decorative
        // unless the admin wrote a genuinely different alt.
        alt={primary?.alt && primary.alt !== product.name ? primary.alt : ''}
        className="aspect-[4/3] w-full"
        priority={priority}
      />
      <div className="flex flex-1 flex-col p-[15px]">
        {product.sku && (
          <span dir="auto" className="text-muted-foreground font-mono text-[0.68rem]">
            {product.sku}
          </span>
        )}
        <h3
          dir="auto"
          className="text-foreground my-1 text-base font-bold leading-tight tracking-tight"
        >
          {product.name}
        </h3>
        <div className="border-border-2 mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <span className="text-muted-foreground text-[0.76rem]">
            {t('moq')}{' '}
            <b dir="auto" className="text-foreground font-mono">
              {product.moq}
            </b>
          </span>
          <span className="text-muted-foreground text-[0.76rem]">{product.unit}</span>
        </div>
      </div>
    </Link>
  );
}
