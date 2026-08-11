import { expect, test } from '@playwright/test';

/**
 * TESTING.md flow 2 — the one that must never be skipped or muted.
 *
 * A price or supplier reaching an anonymous visitor *is* the security bug for
 * this project. The unit suite proves the query module never names a price
 * column; the integration suite proves the returned objects carry none. This
 * proves the last mile: that nothing appears in the **rendered HTML** of a real
 * page, which is where a Server Component passing an object to a Client
 * Component would put it even if it were never displayed.
 */

const LOCALES = ['en', 'tr', 'ar'] as const;

/** Values that must never appear. Supplier names come from scripts/seed.ts. */
const FORBIDDEN = [
  'basePrice',
  'base_price',
  'supplierId',
  'supplier_id',
  'internalNotes',
  'contactEmailInternal',
  'Anatolia Chemicals',
  'Anadolu Kimya',
  'الأناضول للكيماويات',
  'Marmara Packaging',
  'Marmara Ambalaj',
  'مرمرة للتغليف',
];

async function assertClean(html: string, where: string) {
  const lower = html.toLowerCase();
  for (const needle of FORBIDDEN) {
    expect(lower.includes(needle.toLowerCase()), `${where} leaked "${needle}"`).toBe(false);
  }
}

/**
 * Find a real category and product URL for a locale.
 *
 * The catalogue is three levels — category → subcategory → product — so the
 * catalogue page links SUBCATEGORIES, not products. Following the first category
 * link and picking a product from there is the traversal a crawler makes, which
 * is also why it belongs in the test: if a product stops being reachable this
 * way, it has stopped being reachable at all.
 */
async function findCategoryAndProduct(
  request: import('@playwright/test').APIRequestContext,
  locale: string,
): Promise<{ category?: string; product?: string }> {
  const catalogue = await (await request.get(`/${locale}/catalogue`)).text();
  const category = catalogue.match(new RegExp(`href="(/${locale}/catalogue/[^"]+)"`))?.[1];
  if (!category) return {};

  // A product may live on the category page or one level deeper.
  const categoryHtml = await (await request.get(category)).text();
  const productPattern = new RegExp(`href="(/${locale}/product/[^"]+)"`);
  let product = categoryHtml.match(productPattern)?.[1];
  if (!product) {
    const deeper = categoryHtml.match(new RegExp(`href="(/${locale}/catalogue/[^"]+)"`))?.[1];
    if (deeper && deeper !== category) {
      product = (await (await request.get(deeper)).text()).match(productPattern)?.[1];
    }
  }
  return { category, product };
}

for (const locale of LOCALES) {
  test(`${locale}: no price or supplier in any public page's source`, async ({ request }) => {
    const staticPaths = [
      `/${locale}`,
      `/${locale}/catalogue`,
      `/${locale}/about`,
      `/${locale}/contact`,
    ];

    // Discover a real category and product for this locale — slugs are localised,
    // so they cannot be hardcoded, and the tree is three levels deep.
    const { category: categoryHref, product: productHref } = await findCategoryAndProduct(
      request,
      locale,
    );

    const paths = [...staticPaths, categoryHref, productHref].filter((path): path is string =>
      Boolean(path),
    );
    expect(paths.length, 'catalogue should lead to a category and a product').toBeGreaterThan(5);

    for (const path of paths) {
      // request.get() fetches the raw server HTML — not the hydrated DOM — which
      // is what a crawler and a "view source" actually see.
      const response = await request.get(path);
      expect(response.status(), `${path} should render`).toBe(200);
      await assertClean(await response.text(), path);
    }
  });
}

test('the JSON-LD Product carries no offers', async ({ request }) => {
  const { product } = await findCategoryAndProduct(request, 'en');
  expect(product, 'a product should be reachable from the catalogue').toBeTruthy();

  const html = await (await request.get(product!)).text();
  expect(html).toContain('"@type":"Product"');
  expect(html).toContain('"@type":"BreadcrumbList"');
  // Inventing a price to satisfy rich results is the structured-data spam that
  // earns a manual action — we have no public price, so there is no offers block.
  expect(html).not.toContain('"offers"');
});

test('llms.txt and llms-full.txt expose no price or supplier', async ({ request }) => {
  for (const path of ['/llms.txt', '/llms-full.txt']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    await assertClean(await response.text(), path);
  }
});
