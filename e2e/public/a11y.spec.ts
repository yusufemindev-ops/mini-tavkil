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
  // `load`, not `networkidle`. Networkidle waits for 500ms of silence, which five
  // workers hammering a remote Worker never reliably reach — the suite failed a
  // different one or two pages every run and passed 17/17 serially. axe needs a
  // parsed DOM and applied styles, which `load` guarantees; network quiet is
  // neither necessary nor obtainable here.
  await page.goto(path, { waitUntil: 'load' });
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();

  // No exceptions. There used to be one — white on the brand orange measured
  // 3.18:1 and was accepted as a brand decision — but it is fixed rather than
  // excused now: button labels sit on `--primary-button`, a deeper orange
  // already in the palette, and the brand orange is untouched everywhere it is
  // not carrying words. An allowance left behind after its cause is gone is
  // just a hole waiting for the next regression to fall through.

  // Name the rule and the first offending element — "3 violations" is useless
  // when the run is red six weeks later.
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
    // Three levels: the catalogue links subcategories, and products live one
    // level below that. Following the chain is what a crawler does.
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
