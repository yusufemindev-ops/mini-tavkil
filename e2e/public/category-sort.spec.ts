import { expect, test, type Page } from '@playwright/test';

/**
 * Category sorting, which happens in the browser.
 *
 * Sorting used to be a server concern — the page read `?sort=` from
 * `searchParams`, which quietly opted the whole route into dynamic rendering and
 * cost every category URL its edge cache. It moved into the client so the page
 * could go back to being prerendered, and that trade is only sound if three
 * things hold, none of which a unit test can check:
 *
 *   1. The prerendered HTML still contains the products, in the recommended
 *      order. If sorting had been done with `useSearchParams`, Next would put a
 *      Suspense fallback in the HTML instead and a crawler would index an empty
 *      grid — the failure this test exists to catch.
 *   2. Choosing a sort actually reorders the grid and writes the URL.
 *   3. A cold deep link to `?sort=` arrives sorted, since the server ignores the
 *      query entirely now.
 */

const CATEGORY = '/en/catalogue/general-cleaning';

async function names(page: Page) {
  return page.locator('h3').allInnerTexts();
}

test('the prerendered HTML carries the products, not a loading fallback', async ({ request }) => {
  const html = await (await request.get(CATEGORY)).text();

  // Server-rendered product markup, before any JavaScript runs.
  const cards = html.match(/\/en\/product\//g) ?? [];
  expect(cards.length, 'no product links in the server HTML').toBeGreaterThan(5);

  // The response must be edge-cacheable — the entire reason sorting moved.
  const headers = (await request.get(CATEGORY)).headers();
  expect(headers['cache-control'], 'category page went dynamic again').not.toContain('no-store');
});

test('choosing a sort reorders the grid and records it in the URL', async ({ page }) => {
  await page.goto(CATEGORY, { waitUntil: 'load' });

  const recommended = await names(page);
  expect(recommended.length).toBeGreaterThan(3);

  await page.getByRole('combobox').selectOption('az');

  await expect(page).toHaveURL(/\?sort=az/);
  const sorted = await names(page);

  // Same products, alphabetical. Compared with a collator because the page sorts
  // with one, and a plain `<` disagrees with it on accented names.
  const collator = new Intl.Collator('en');
  expect([...sorted].sort(collator.compare)).toEqual(sorted);
  expect([...sorted].sort()).toEqual([...recommended].sort());

  // Returning to the default clears the query, keeping the canonical URL clean.
  await page.getByRole('combobox').selectOption('recommended');
  await expect(page).toHaveURL((url) => !url.search.includes('sort'));
  expect(await names(page)).toEqual(recommended);
});

test('a cold deep link to ?sort= arrives sorted', async ({ page }) => {
  await page.goto(`${CATEGORY}?sort=az`, { waitUntil: 'load' });

  await expect(page.getByRole('combobox')).toHaveValue('az');
  const sorted = await names(page);
  expect([...sorted].sort(new Intl.Collator('en').compare)).toEqual(sorted);
});

test('an unknown sort value falls back rather than erroring', async ({ page }) => {
  await page.goto(`${CATEGORY}?sort=nonsense`, { waitUntil: 'load' });

  await expect(page.getByRole('combobox')).toHaveValue('recommended');
  expect((await names(page)).length).toBeGreaterThan(3);
});
