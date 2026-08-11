import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import {
  publicCategories,
  publicDetailsFor,
  publicProducts,
  type Locale,
} from '@/lib/queries/public-product';

/**
 * `llms.txt` and `llms-full.txt`.
 *
 * These exist because an answer engine that can read the catalogue as structured
 * facts will describe it correctly, and one that has to infer it from marketing
 * copy will invent things. The most likely thing for it to invent is a price —
 * so both files state plainly that pricing is by quote, and neither contains a
 * price or a supplier. They are built from the same `publicProduct` shape as the
 * pages, which has no field for either.
 */

const LOCALE_NAMES: Record<string, string> = { en: 'English', tr: 'Turkish', ar: 'Arabic' };

function siteHeader(base: string): string {
  return [
    '# Tavkil',
    '',
    '> Wholesale sourcing from verified manufacturers in Türkiye. The catalogue is',
    '> public: full specifications, minimum order quantities and country of origin',
    '> are published on every product. Pricing is by quote — there are no public',
    '> prices, and no supplier identities are published.',
    '',
    `Languages: ${routing.locales.map((l) => LOCALE_NAMES[l] ?? l).join(', ')}`,
    `Contact: ${base}/en/contact`,
    '',
  ].join('\n');
}

/** The short index: what the site is, and where the catalogue lives. */
export async function buildLlmsTxt(): Promise<string> {
  const base = env.baseUrl.replace(/\/+$/, '');
  const categories = await publicCategories('en' as Locale);
  const roots = categories.filter((category) => category.parent === null);

  const lines = [
    siteHeader(base),
    '## Catalogue',
    '',
    ...roots.map((category) => {
      const description = category.description ? `: ${category.description}` : '';
      return `- [${category.name}](${base}/en/catalogue/${category.slug})${description}`;
    }),
    '',
    '## Pages',
    '',
    `- [Catalogue](${base}/en/catalogue): every published category and product`,
    `- [About](${base}/en/about): who runs the marketplace and how sourcing works`,
    `- [Contact](${base}/en/contact): request a quote`,
    '',
    '## Full catalogue',
    '',
    `- [llms-full.txt](${base}/llms-full.txt): every product with its specifications`,
    '',
  ];

  return lines.join('\n');
}

/** Every published product as structured facts. */
export async function buildLlmsFullTxt(): Promise<string> {
  const base = env.baseUrl.replace(/\/+$/, '');
  const [categories, products] = await Promise.all([
    publicCategories('en' as Locale),
    publicProducts({}, 'en' as Locale),
  ]);

  // The list read omits attributes and options (they would be a query per row on
  // a grid), and this file wants both. Fetching them per product meant ~5 queries
  // × every product from ONE Worker invocation — past Cloudflare's subrequest
  // limit at a dozen products, so the route 500'd with `fetch failed` and took
  // the build's prerender down with it. Two set-based reads instead, flat in the
  // number of products.
  const { attributes: attributesBy, options: optionsBy } = await publicDetailsFor(
    products.map((product) => product.id),
    'en' as Locale,
  );

  const sections = products.map((product) => {
    const facts: string[] = [];
    if (product.sku) facts.push(`- SKU: ${product.sku}`);
    if (product.category) facts.push(`- Category: ${product.category.name}`);
    if (product.brandName) facts.push(`- Brand: ${product.brandName}`);
    if (product.countryOfOrigin) facts.push(`- Country of origin: ${product.countryOfOrigin}`);
    facts.push(`- Minimum order: ${product.moq} ${product.unit}`);
    if (product.boxQuantity) facts.push(`- Units per box: ${product.boxQuantity}`);
    for (const attribute of attributesBy.get(product.id) ?? []) {
      facts.push(`- ${attribute.label}: ${attribute.value}`);
    }
    for (const option of optionsBy.get(product.id) ?? []) {
      facts.push(`- ${option.name}: ${option.values.map((v) => v.label).join(', ')}`);
    }
    facts.push(`- Pricing: by quote — contact ${base}/en/contact`);

    return [
      `### ${product.name}`,
      '',
      `${base}/en/product/${product.slug}`,
      '',
      product.description || '',
      product.description ? '' : null,
      ...facts,
      '',
    ]
      .filter((line) => line !== null)
      .join('\n');
  });

  return [
    siteHeader(base),
    '## Categories',
    '',
    ...categories
      .filter((category) => category.parent === null)
      .map((category) => `- ${category.name} — ${base}/en/catalogue/${category.slug}`),
    '',
    `## Products (${sections.length})`,
    '',
    ...sections,
  ].join('\n');
}
