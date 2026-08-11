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

/**
 * The one accepted exception, and it is a brand decision rather than an oversight.
 *
 * Tavkil's brand orange is `#f2640c`. White on it measures **3.18:1** where AA
 * wants 4.5:1 for normal text — so every primary button label and the active
 * language pill misses. Deepening the orange itself cleared it, but that
 * changed the brand on every page of the site, which is the wrong trade for a
 * project whose whole point is to carry the Tavkil brand forward. The owner chose
 * to keep the exact orange for fills (2026-08-11).
 *
 * Text is NOT part of the exception: orange used as text goes through
 * `--primary-ink` (#bd4c06), which clears 4.5:1 on white, on --primary-soft and
 * on --background-2. So this allows exactly one pairing
 * — white foreground on the brand orange — and anything else still fails the run.
 */
const BRAND_ORANGE = '#f2640c';

function isAcceptedBrandContrast(node: { any: { id: string; data?: unknown }[] }): boolean {
  const data = node.any.find((check) => check.id === 'color-contrast')?.data as
    { fgColor?: string; bgColor?: string; contrastRatio?: number } | undefined;
  if (!data) return false;
  // White on the brand orange, and nothing else. --primary-ink was darkened to
  // #bd4c06 so orange TEXT now clears 4.5:1 on white, on --primary-soft and on
  // --background-2 — it needs no exception at all.
  return data.fgColor?.toLowerCase() === '#ffffff' && data.bgColor?.toLowerCase() === BRAND_ORANGE;
}

async function scan(page: import('@playwright/test').Page, path: string) {
  // `load`, not `networkidle`. Networkidle waits for 500ms of silence, which five
  // workers hammering a remote Worker never reliably reach — the suite failed a
  // different one or two pages every run and passed 17/17 serially. axe needs a
  // parsed DOM and applied styles, which `load` guarantees; network quiet is
  // neither necessary nor obtainable here.
  await page.goto(path, { waitUntil: 'load' });
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();

  // Drop only the nodes covered by the brand exception; a violation whose nodes
  // are all accepted disappears, one with any other node still fails.
  const violations = results.violations
    .map((v) =>
      v.id === 'color-contrast'
        ? { ...v, nodes: v.nodes.filter((n) => !isAcceptedBrandContrast(n)) }
        : v,
    )
    .filter((v) => v.nodes.length > 0);

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
