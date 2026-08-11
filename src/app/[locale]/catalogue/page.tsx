import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, PackageOpen } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CategoryRail } from '@/components/catalog/category-rail';
import { CategoryMenuMobile } from '@/components/catalog/category-menu-mobile';
import { SubcategoryTile } from '@/components/catalog/subcategory-tile';
import { ProductCard } from '@/components/catalog/product-card';
import { Link } from '@/i18n/navigation';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, collectionSchema, JsonLd } from '@/lib/seo/json-ld';
import {
  publicCategories,
  publicProducts,
  type Locale,
  type PublicProduct,
} from '@/lib/queries/public-product';

// One query per hour rather than one per visitor. The catalogue changes when an
// admin publishes, not continuously, and a cached HTML response is what keeps LCP
// off the database.
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'store' });
  return buildMetadata({
    locale,
    path: '/catalogue',
    title: `${t('cat_title')} · Tavkil`,
    description: t('cat_meta'),
  });
}

export default async function CataloguePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('store');

  const all = await publicCategories(locale as Locale);
  const roots = all.filter((category) => category.parent === null);
  const childrenOf = (slug: string) => all.filter((c) => c.parent?.slug === slug);

  // A category with no children has nothing to tile, so preview its products
  // instead. That also shortens crawl depth: every previewed product is two
  // clicks from the homepage rather than three (PLAN.md §11 — internal linking
  // matters more than the markup).
  //
  // One read for all of them, grouped in memory, rather than a `publicProducts()`
  // call per childless category. The identical pattern on the homepage exhausted
  // the outbound connection budget during a build and killed prerendering with
  // `NeonDbError: fetch failed`. It is inert here today because every root has
  // children — which is exactly why it would come back unnoticed.
  const leaves = roots.filter((category) => childrenOf(category.slug).length === 0);
  const previews = new Map<string, PublicProduct[]>();
  if (leaves.length > 0) {
    const products = await publicProducts({}, locale as Locale);
    const rootSlugOf = (categorySlug: string) =>
      all.find((c) => c.slug === categorySlug)?.parent?.slug ?? categorySlug;

    for (const category of leaves) {
      previews.set(
        category.id,
        products
          .filter((product) => {
            const slug = product.category?.slug;
            return slug ? rootSlugOf(slug) === category.slug : false;
          })
          .slice(0, 8),
      );
    }
  }

  // Shared by the desktop rail and the mobile dropdown — anchors to the sections.
  const railItems = roots.map((category) => ({
    id: category.id,
    label: category.name,
    href: `#cat-${category.id}`,
    slug: category.slug,
  }));

  const trail = [{ name: t('nav_home'), path: '' }, { name: t('nav_catalog') }];

  return (
    <>
      {/* The one public page type that carried no structured data. It lists
          categories rather than products, so `itemBase` points at /catalogue —
          the default would advertise /product/<category-slug>, which 404s. */}
      <JsonLd
        schema={[
          collectionSchema({
            locale,
            path: '/catalogue',
            name: t('cat_title'),
            description: t('cat_meta'),
            items: roots.flatMap((root) => [
              { name: root.name, slug: root.slug },
              ...childrenOf(root.slug).map((child) => ({ name: child.name, slug: child.slug })),
            ]),
            itemBase: '/catalogue',
          }),
          breadcrumbSchema(locale, trail),
        ]}
      />
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-[1520px] flex-1 px-5 py-10 sm:px-6">
        <header className="max-w-2xl">
          <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
            {t('cat_title')}
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">
            {t.rich('cat_lead', {
              contact: (chunks) => (
                <Link href="/contact" className="text-primary-ink font-medium hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </header>

        {roots.length === 0 ? (
          <div className="border-border mt-10 flex flex-col items-center rounded-xl border border-dashed px-6 py-20 text-center">
            <PackageOpen className="text-muted-foreground mb-4 size-10" aria-hidden />
            <h2 className="text-foreground text-lg font-semibold">{t('cat_empty_t')}</h2>
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
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[300px_1fr] lg:items-start">
            <CategoryRail
              title={t('cat_categories')}
              className="top-[calc(var(--height-nav)+1rem)] hidden lg:sticky lg:block"
              items={railItems}
            />

            <div className="flex flex-col gap-10">
              <CategoryMenuMobile
                title={t('cat_categories')}
                items={railItems}
                className="sticky top-[calc(var(--height-nav)+0.5rem)] z-20 lg:hidden"
              />
              {roots.map((category) => {
                const children = childrenOf(category.slug);
                return (
                  <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-24">
                    <div className="border-border mb-4 flex items-center justify-between gap-4 border-b pb-3">
                      <h2
                        dir="auto"
                        className="text-foreground text-xl font-bold tracking-tight sm:text-2xl"
                      >
                        {category.name}
                      </h2>
                      <Link
                        href={`/catalogue/${category.slug}`}
                        // py-1 gives this a 24px-tall hit area. WCAG 2.2 (2.5.8) wants 24×24 for a
                        // standalone control, and at text-sm alone it measured 20px.
                        className="text-primary-ink inline-flex shrink-0 items-center gap-1 py-1 text-sm font-medium hover:underline"
                      >
                        {t('cat_viewall')}
                        <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
                      </Link>
                    </div>
                    {children.length > 0 ? (
                      // Intrinsic columns: tiles never shrink below ~180px, so the
                      // count adapts instead of cramming six into a narrow space.
                      //
                      // Every child renders. This was capped at 12, which never
                      // fired while there were two roots holding six and eight —
                      // then the two merged into one root of fourteen and the page
                      // quietly stopped showing Steel Wire Rope and Plaster
                      // Sponges. A cap that hides part of the catalogue with no
                      // indication is worse than a long page, and this catalogue
                      // is meant to grow.
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
                        {children.map((child) => (
                          <SubcategoryTile key={child.id} category={child} />
                        ))}
                      </div>
                    ) : (previews.get(category.id) ?? []).length > 0 ? (
                      <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 lg:grid-cols-4">
                        {previews.get(category.id)?.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    ) : (
                      // Published but empty: say so rather than leaving a gap under
                      // the heading.
                      <p className="text-muted-foreground text-sm">{t('cat_empty_d')}</p>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
