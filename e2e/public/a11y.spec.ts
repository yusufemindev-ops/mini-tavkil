import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * §14e — WCAG 2.1 AA, zero violations, not "few".
 *
 * Run through Playwright rather than the DevTools MCP because the site's own CSP
 * blocks fetching axe from a CDN (`connect-src 'self'`). Playwright injects it
 * through CDP, outside the page's CSP — which is the right way round: the CSP
 * should stop a page loading third-party script, and the test harness should not
 * be constrained by it.
 *
 * Arabic is tested too. RTL breaks focus order and `aria-label` direction more
 * often than people expect, and it is the locale least likely to be checked by
 * hand.
 */
const LOCALES = ['en', 'tr', 'ar'] as const;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function scan(page: import('@playwright/test').Page, path: string) {
  await page.goto(path, { waitUntil: 'networkidle' });
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();

  // Name the rule and the first offending element — "3 violations" is useless
  // when the run is red six weeks later.
  const summary = results.violations
    .map((v) => `${v.id} (${v.impact}, ${v.nodes.length}×): ${v.nodes[0]?.target?.join(' ')}`)
    .join('\n');
  expect(results.violations, `${path}\n${summary}`).toEqual([]);
}

for (const locale of LOCALES) {
  test(`${locale}: home is clean`, async ({ page }) => scan(page, `/${locale}`));
  test(`${locale}: catalogue is clean`, async ({ page }) => scan(page, `/${locale}/catalogue`));
  test(`${locale}: about is clean`, async ({ page }) => scan(page, `/${locale}/about`));
  test(`${locale}: contact is clean`, async ({ page }) => scan(page, `/${locale}/contact`));

  test(`${locale}: category and product are clean`, async ({ page }) => {
    await page.goto(`/${locale}/catalogue`);
    const category = await page
      .locator(`a[href^="/${locale}/catalogue/"]`)
      .first()
      .getAttribute('href');
    const product = await page
      .locator(`a[href^="/${locale}/product/"]`)
      .first()
      .getAttribute('href');

    if (category) await scan(page, category);
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
