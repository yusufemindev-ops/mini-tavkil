import { getTranslations } from 'next-intl/server';
import { PackageOpen } from 'lucide-react';
import { ProductCard } from '@/components/catalog/product-card';
import { CategoryListing } from '@/components/catalog/category-listing';
import { Link } from '@/i18n/navigation';

import type { PublicProduct } from '@/lib/queries/public-product';

/**
 * Server-rendered category product grid passed as pre-built cards to `CategoryListing` for client-side sorting.
 */
export async function CategoryProductGrid({
  products,
  total,
  locale,
}: {
  products: PublicProduct[];
  total: number;
  locale: string;
}) {
  const t = await getTranslations('store');

  if (products.length === 0) {
    return (
      <div className="border-border flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
        <PackageOpen className="text-muted-foreground mb-4 size-9" aria-hidden />
        <h2 className="text-foreground text-base font-semibold">{t('cat_empty_t')}</h2>
        <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
          {t('cat_empty_d')}
        </p>
        <Link
          href="/contact"
          className="bg-primary-button text-primary-button-foreground hover:bg-primary-hover mt-5 inline-flex items-center rounded-sm px-4 py-2 text-sm font-medium transition-colors"
        >
          {t('cat_empty_cta')}
        </Link>
      </div>
    );
  }

  return (
    <CategoryListing
      total={total}
      locale={locale}
      cards={products.map((product, index) => ({
        id: product.id,
        // The sort keys, so the browser can reproduce `orderFor()` exactly.
        moq: product.moq,
        name: product.name,
        // Only the first card is eager-loaded. It is the LCP candidate; giving
        // four images high priority at once makes them compete for the same
        // connection budget and delays the one that actually paints.
        node: <ProductCard key={product.id} product={product} priority={index === 0} />,
      }))}
    />
  );
}
