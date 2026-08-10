import { BASE_URL, SITE_NAME } from './metadata';

type Schema = Record<string, unknown>;

// Renders JSON-LD as a native <script> tag, which is Next 16's recommended
// approach for structured data. Escaping "<" to its < form scrubs HTML tags
// from the payload so a hostile string in a product name can't break out of the
// script block.
export function JsonLd({ schema }: { schema: Schema | Schema[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}

export function organizationSchema(): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: BASE_URL,
  };
}

// WebSite so search engines and answer engines understand the site identity.
// Tavkil also emitted a SearchAction pointing at /search — there is no search
// route here, and advertising an entry point that 404s is worse than omitting it.
export function websiteSchema(locale: string): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${BASE_URL}/${locale}`,
    inLanguage: locale,
  };
}

export type BreadcrumbLink = { name: string; path?: string };

/**
 * BreadcrumbList for a product or category page.
 *
 * `path` is the locale-prefix-less path; the last item is the current page and
 * carries no `item`, per Google's guidance.
 */
export function breadcrumbSchema(locale: string, trail: BreadcrumbLink[]): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: `${BASE_URL}/${locale}${crumb.path}` } : {}),
    })),
  };
}

/**
 * `Product` **without `offers`**.
 *
 * This is deliberate and load-bearing, not an omission. We have no public price,
 * and an `offers` block with an invented price is exactly the structured-data spam
 * that earns a manual action. Google will not show a price-rich result for this
 * page; it will still parse name, brand, sku, images, and properties.
 */
export function productSchema({
  locale,
  slug,
  name,
  description,
  sku,
  brandName,
  categoryName,
  countryOfOrigin,
  images,
  attributes,
}: {
  locale: string;
  slug: string;
  name: string;
  description: string;
  sku: string | null;
  brandName: string | null;
  categoryName: string | null;
  countryOfOrigin: string | null;
  images: string[];
  attributes: { label: string; value: string }[];
}): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    url: `${BASE_URL}/${locale}/product/${slug}`,
    ...(description ? { description } : {}),
    ...(sku ? { sku } : {}),
    ...(brandName ? { brand: { '@type': 'Brand', name: brandName } } : {}),
    ...(categoryName ? { category: categoryName } : {}),
    ...(countryOfOrigin ? { countryOfOrigin } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    ...(attributes.length > 0
      ? {
          additionalProperty: attributes.map((attribute) => ({
            '@type': 'PropertyValue',
            name: attribute.label,
            value: attribute.value,
          })),
        }
      : {}),
  };
}

// CollectionPage + ItemList for a category listing.
export function collectionSchema({
  locale,
  path,
  name,
  description,
  items,
}: {
  locale: string;
  path: string;
  name: string;
  description: string | null;
  items: { name: string; slug: string }[];
}): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: `${BASE_URL}/${locale}${path}`,
    inLanguage: locale,
    ...(description ? { description } : {}),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: `${BASE_URL}/${locale}/product/${item.slug}`,
      })),
    },
  };
}
