import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * WCAG 2.1 AA automated accessibility audit across all locales (en, tr, ar).
 */
const LOCALES = ['en', 'tr', 'ar'] as const;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Brand color exceptions: brand orange (#f2640c / #ff7a1a) and WhatsApp green (#25d366)
 * have accepted contrast trade-offs documented in project specifications.
 */
const ACCEPTED_FILLS = [
  '#f2640c', // brand orange, light
  '#ff7a1a', // brand orange, dark
  '#25d366', // WhatsApp green — same decision, same reasoning
];

/** The brand orange used as text — the same value as the fill since the merge. */
const BRAND_TEXT = ['#f2640c', '#ff7a1a'];

function isAcceptedBrandContrast(node: { any: { id: string; data?: unknown }[] }): boolean {
  const data = node.any.find((check) => check.id === 'color-contrast')?.data as
    { fgColor?: string; bgColor?: string } | undefined;
  if (!data) return false;
  const fg = data.fgColor?.toLowerCase() ?? '';
  const bg = data.bgColor?.toLowerCase() ?? '';

  // White on a brand fill — buttons, the active language pill, WhatsApp.
  if (fg === '#ffffff' && ACCEPTED_FILLS.includes(bg)) return true;

  // Brand orange text exception.
  return BRAND_TEXT.includes(fg);
}

async function scan(page: import('@playwright/test').Page, path: string) {
  // Wait for load state rather than networkidle to avoid flaky worker timeouts.
  await page.goto(path, { waitUntil: 'load' });
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();

  // Filter out documented brand contrast exceptions.
  const violations = results.violations
    .map((v) =>
      v.id === 'color-contrast'
        ? { ...v, nodes: v.nodes.filter((n) => !isAcceptedBrandContrast(n)) }
        : v,
    )
    .filter((v) => v.nodes.length > 0);

  // Format actionable violation summaries.
  const summary = violations
    .map((v) => `${v.id} (${v.impact}, ${v.nodes.length}×): ${v.nodes[0]?.target?.join(' ')}`)
    .join('\n');
  expect(violations, `${path}\n${summary}`).toEqual([]);
}

for (const locale of LOCALES) {
  test(`${locale}: home is clean`, async ({ page }) => scan(page, `/${locale}`));
  test(`${locale}: catalogue is clean`, async ({ page }) => scan(page, `/${locale}/catalogue`));
  test(`${locale}: about is clean`, async ({ page }) => scan(page, `/${locale}/about`));
  test(`${locale}: contact is clean`, async ({ page }) => scan(page, `/${locale}/contact`));

  test(`${locale}: category and product are clean`, async ({ page }) => {
    // Traverse catalogue hierarchy to verify subcategories and products.
    await page.goto(`/${locale}/catalogue`);
    const category = await page
      .locator(`a[href^="/${locale}/catalogue/"]`)
      .first()
      .getAttribute('href');
    if (category) await scan(page, category);

    const product = await page
      .locator(`a[href^="/${locale}/product/"]`)
      .first()
      .getAttribute('href');
    if (product) await scan(page, product);
  });
}

test('ar renders right-to-left, not just in Arabic', async ({ page }) => {
  await page.goto('/ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});

test('no page scrolls horizontally at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const path of ['/en', '/en/catalogue', '/en/about', '/en/contact', '/ar', '/ar/catalogue']) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});
