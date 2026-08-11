import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ProductGallery } from '@/components/product/product-gallery';
import { ProductOptions } from '@/components/product/product-options';
import { ProductEnquiryPanel } from '@/components/product/product-enquiry-panel';
import { ProductTabs } from '@/components/product/product-tabs';
import { RegisterLocalizedPaths } from '@/components/localized-paths';
import { decodeSlug, localizedPathMap } from '@/lib/catalog/localized-path';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, JsonLd, productSchema } from '@/lib/seo/json-ld';
import { publicProduct, publicSitemapEntries, type Locale } from '@/lib/queries/public-product';

export const revalidate = 3600;

/**
 * Prerender every published product, in every locale it is translated into that exists at build time.
 *
 * Without this the route has a dynamic segment Next cannot enumerate, so it is
 * marked `ƒ Dynamic` and every request answers
 * `Cache-Control: private, no-cache, no-store` — no edge cache, and a Neon round
 * trip on every crawler hit. `revalidate = 3600` alone does not fix that: there
 * has to be something to revalidate.
 *
 * `dynamicParams` stays at its default of `true` on purpose. A product published
 * in the admin after this build must appear without a redeploy; it renders on
 * demand the first time and is cached from then on.
 *
 * The query is the sitemap's, so both surfaces enumerate the catalogue the same
 * way — published rows, and only locales with a complete translation.
 */
export async function generateStaticParams() {
  const rows = await publicSitemapEntries();
  return rows
    .filter((row) => row.type === 'product')
    .map((row) => ({ locale: row.locale, slug: row.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await publicProduct(decodeSlug(slug), locale as Locale);
  if (!product) return {};

  return buildMetadata({
    locale,
    path: `/product/${product.slug}`,
    title: `${product.name} · Tavkil`,
    // The short line first: a 75-word paragraph cut at 155 characters reads as a
    // truncation, which is what a searcher sees before deciding to click.
    description: product.seoDescription || product.description || product.name,
    // Not 'article': that vertical means time-stamped editorial and invites
    // parsers to look for an author and a publish date this page does not have.
    ogType: 'website',
    ogImage: product.images[0]?.url,
    // Only locales with a genuine complete translation are advertised.
    alternateLocales: Object.keys(product.localizedSlugs),
    localizedPaths: localizedPathMap('/product', product.localizedSlugs),
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('store');

  const product = await publicProduct(decodeSlug(slug), locale as Locale);
  if (!product) notFound();

  const trail = [
    { name: t('nav_home'), path: '' },
    { name: t('nav_catalog'), path: '/catalogue' },
    ...(product.category
      ? [{ name: product.category.name, path: `/catalogue/${product.category.slug}` }]
      : []),
    { name: product.name },
  ];

  // "(N pcs)" when a sellable unit bundles several items.
  const packSuffix =
    product.packSize && product.packSize > 1
      ? ` (${t('pd_pack_pcs', { count: product.packSize })})`
      : '';

  // Right-rail key facts. No category — the breadcrumb has it. No attributes —
  // those are the Specifications table below. And no supplier, ever.
  const keyFacts: { label: string; value: string; mono?: boolean }[] = [
    {
      label: t('pd_lbl_moq'),
      value: `${product.moq} ${product.unit}${packSuffix}`,
      mono: true,
    },
    ...(product.brandName ? [{ label: t('pd_lbl_brand'), value: product.brandName }] : []),
    ...(product.countryOfOrigin
      ? [{ label: t('pd_lbl_origin'), value: product.countryOfOrigin }]
      : []),
  ];

  /**
   * What a buyer needs to cost a shipment.
   *
   * All four come from the supplier's own price list and were imported from day
   * one; only the carton quantity was ever rendered, so the specification table
   * read as a single row and looked like missing data. Numeric columns arrive
   * from pg as strings, so trailing zeros are trimmed rather than printed —
   * "7.30" reads as a decision, "7.3" reads as a measurement.
   */
  const trim = (value: string) => String(Number(value));
  const packagingFacts = [
    ...(product.boxQuantity
      ? [{ label: t('pd_lbl_box'), value: String(product.boxQuantity) }]
      : []),
    ...(product.weightKg
      ? [{ label: t('pd_lbl_weight'), value: `${trim(product.weightKg)} kg` }]
      : []),
    ...(product.cbm ? [{ label: t('pd_lbl_cbm'), value: `${trim(product.cbm)} m³` }] : []),
    ...(product.gtin13 ? [{ label: t('pd_lbl_barcode'), value: product.gtin13 }] : []),
  ];

  return (
    <>
      <RegisterLocalizedPaths paths={localizedPathMap('/product', product.localizedSlugs)} />
      <JsonLd
        schema={[
          productSchema({
            updatedAt: product.updatedAt,
            locale,
            slug: product.slug,
            name: product.name,
            description: product.description,
            sku: product.sku,
            gtin13: product.gtin13,
            brandName: product.brandName,
            categoryName: product.category?.name ?? null,
            countryOfOrigin: product.countryOfOrigin,
            images: product.images.map((image) => image.url),
            attributes: product.attributes,
          }),
          breadcrumbSchema(locale, trail),
        ]}
      />
      <SiteHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-[var(--width-container)] flex-1 px-5 py-8 sm:px-6"
      >
        <Breadcrumb
          items={trail.map((crumb) => ({ label: crumb.name, href: crumb.path || undefined }))}
        />

        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <ProductGallery images={product.images} productName={product.name} />

          <div>
            <h1 dir="auto" className="text-foreground text-3xl font-bold tracking-tight">
              {product.name}
            </h1>
            {product.sku && (
              <div dir="auto" className="text-muted-foreground mt-1 font-mono text-sm">
                {product.sku}
              </div>
            )}

            {/* Flex rather than grid so the facts fill the width evenly at any
                count — a grid leaves an empty cell when there are two. */}
            <dl className="border-border bg-card mt-6 flex flex-wrap overflow-hidden rounded-lg border">
              {keyFacts.map((fact, index) => (
                <div
                  key={fact.label}
                  className={cn('min-w-[8rem] flex-1 p-3.5', index > 0 && 'border-border border-s')}
                >
                  <dt className="text-muted-foreground text-[0.72rem] uppercase tracking-wide">
                    {fact.label}
                  </dt>
                  <dd
                    // "12 L" is a number followed by a Latin unit. In an RTL
                    // paragraph the bidi algorithm reorders that to "L 12", which
                    // reads as a different quantity. Isolating the run keeps it
                    // in logical order without forcing the whole cell LTR.
                    dir="auto"
                    className={cn(
                      'text-foreground mt-1 text-sm',
                      fact.mono && 'font-mono rtl:text-right',
                    )}
                  >
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>

            <ProductOptions options={product.options} />

            <ProductEnquiryPanel
              slug={product.slug}
              name={product.name}
              moq={product.moq}
              unit={product.unit}
              packSize={product.packSize}
            />
          </div>
        </div>

        <div className="mt-12">
          <ProductTabs
            tabs={[
              ...(product.attributes.length > 0 || packagingFacts.length > 0
                ? [
                    {
                      id: 'specs',
                      label: t('pd_specs'),
                      content: (
                        <div className="space-y-8">
                          {product.attributes.length > 0 && (
                            // gap-px over a bg-border background draws the rules.
                            <dl className="border-border bg-border grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2">
                              {product.attributes.map((attribute) => (
                                <div
                                  key={attribute.label}
                                  className="bg-card grid grid-cols-[40%_1fr]"
                                >
                                  <dt dir="auto" className="text-muted-foreground p-3.5 text-sm">
                                    {attribute.label}
                                  </dt>
                                  <dd
                                    dir="auto"
                                    className="text-foreground p-3.5 text-sm font-medium"
                                  >
                                    {attribute.value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          )}

                          {packagingFacts.length > 0 && (
                            <div>
                              <h2 className="text-foreground mb-3 text-sm font-semibold">
                                {t('pd_packaging')}
                              </h2>
                              <dl className="border-border bg-border grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2">
                                {packagingFacts.map((fact) => (
                                  <div
                                    key={fact.label}
                                    className="bg-card grid grid-cols-[40%_1fr]"
                                  >
                                    <dt className="text-muted-foreground p-3.5 text-sm">
                                      {fact.label}
                                    </dt>
                                    <dd
                                      dir="auto"
                                      className="text-foreground p-3.5 font-mono text-sm font-medium"
                                    >
                                      {fact.value}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            </div>
                          )}
                        </div>
                      ),
                    },
                  ]
                : []),
              {
                id: 'about',
                label: t('pd_about'),
                content: (
                  <div className="text-muted-foreground max-w-3xl space-y-4 leading-relaxed">
                    <p>{product.description || t('pd_about_text')}</p>
                    {product.specsMd && <p className="whitespace-pre-line">{product.specsMd}</p>}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
