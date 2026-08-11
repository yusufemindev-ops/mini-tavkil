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
 * One accepted pairing, and it is a brand decision rather than an oversight.
 *
 * Tavkil's orange is `#f2640c` (`#ff7a1a` in dark mode). White on it measures
 * 3.18:1 and 2.61:1, where AA wants 4.5:1 — so primary button labels and the
 * active language pill miss.
 *
 * This has now been decided twice. It was fixed once, by deepening the button
 * fill to #bd4c06 and darkening the dark-mode label; the owner looked at the
 * result and rejected it both times. The brand orange is the brand, and a button
 * that is not that colour is not Tavkil's button. Lighthouse accessibility sits
 * at 96 rather than 100 as a result, which is the cost of that call.
 *
 * The exception is exactly three pairings — white on either theme's orange, and
 * white on WhatsApp's green — and nothing else. Orange used as *text* goes through `--primary-ink` (#bd4c06),
 * which clears 4.5:1 on white, on --primary-soft and on --background-2, so it
 * needs no exception at all. Any other contrast regression still fails the run.
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

  // The brand orange used as TEXT. `--primary-ink` used to be a darker orange
  // (#bd4c06, 5.00:1) so that orange text would clear AA on its own. The owner
  // saw the two oranges together on one page, called it two brands, and chose
  // one — so link and nav text is now #f2640c at 3.18:1. Same trade as the
  // fills, made knowingly, recorded in GO-LIVE.md.
  return BRAND_TEXT.includes(fg);
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
