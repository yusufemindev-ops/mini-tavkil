import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { RegisterLocalizedPaths } from '@/components/localized-paths';
import { cn } from '@/lib/utils';
import { decodeSlug, localizedPathMap } from '@/lib/catalog/localized-path';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { CategoryProductGrid } from '@/components/catalog/category-product-grid';
import { CategoryFilters } from '@/components/catalog/category-filters';
import { CategorySort } from '@/components/catalog/category-sort';
import { buildMetadata } from '@/lib/seo/metadata';
import { parseProductSort } from '@/lib/catalog/product-sort';
import {
  publicCategories,
  publicCategory,
  publicProductCount,
  publicProducts,
  type Locale,
  type PublicCategory,
} from '@/lib/queries/public-product';

export const revalidate = 3600;

// Sibling subcategories, and the top-level category the "All" filter points at.
// A root category filters on itself and offers its own children; a child filters
// within its parent and offers its siblings.
async function siblingsFor(category: PublicCategory, locale: Locale) {
  const all = await publicCategories(locale);
  const parentSlug = category.parent?.slug ?? category.slug;
  return {
    parentSlug,
    siblings: all.filter((c) => c.parent?.slug === parentSlug),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  const found = await publicCategory(decodeSlug(category), locale as Locale);
  if (!found) return {};

  return buildMetadata({
    locale,
    path: `/catalogue/${found.slug}`,
    title: `${found.name} · Tavkil`,
    description: found.description ?? found.name,
    // Advertise only the locales that actually have a translation for this row.
    alternateLocales: Object.keys(found.localizedSlugs),
    // Each hreflang and the canonical point at that locale's own slug.
    localizedPaths: localizedPathMap('/catalogue', found.localizedSlugs),
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { locale, category } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('store');

  const slug = decodeSlug(category);
  const found = await publicCategory(slug, locale as Locale);
  // An unknown or unpublished slug is a 404, not an empty page — an empty page
  // would be indexable and would dilute the site.
  if (!found) notFound();

  const sort = parseProductSort((await searchParams).sort);
  const filter = {
    category: found.slug,
    // A root category lists everything beneath it; otherwise a parent whose
    // products all live in children would render an empty grid.
    includeDescendants: found.parent === null,
    sort,
  };

  const [products, total, { parentSlug, siblings }] = await Promise.all([
    publicProducts(filter, locale as Locale),
    publicProductCount(filter, locale as Locale),
    siblingsFor(found, locale as Locale),
  ]);

  return (
    <>
      <RegisterLocalizedPaths paths={localizedPathMap('/catalogue', found.localizedSlugs)} />
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1520px] flex-1 px-5 py-8 sm:px-6">
        <Breadcrumb
          items={[
            { label: t('nav_home'), href: '/' },
            { label: t('nav_catalog'), href: '/catalogue' },
            ...(found.parent
              ? [{ label: found.parent.name, href: `/catalogue/${found.parent.slug}` }]
              : []),
            { label: found.name },
          ]}
        />
        <header className="mb-6">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">{found.name}</h1>
          {found.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl">{found.description}</p>
          )}
        </header>

        {/* The filter rail renders nothing when a category has no siblings, so the
            column only exists when something occupies it — otherwise the grid
            hands its 300px track to the product grid and every card collapses. */}
        <div
          className={cn(
            'grid gap-8 lg:items-start',
            siblings.length > 0 && 'lg:grid-cols-[300px_1fr]',
          )}
        >
          <CategoryFilters
            siblings={siblings}
            parentSlug={parentSlug}
            activeSlug={found.slug}
            sort={sort}
          />

          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground font-mono text-sm">
                {total} {t('cat_results')}
              </p>
              {products.length > 0 && <CategorySort value={sort} />}
            </div>

            <CategoryProductGrid products={products} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
