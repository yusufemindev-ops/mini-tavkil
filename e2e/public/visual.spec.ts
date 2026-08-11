import { expect, test, type Page } from '@playwright/test';

/**
 * A screenshot of every public page, in every locale, in both themes.
 *
 * Not pixel-diffing against a baseline: the catalogue is real data that changes
 * when the owner edits it, so a byte-comparison would cry wolf on every publish
 * and be muted within a week. What this does is capture the full set in one run
 * so a human can look — which is the review that actually caught the blank
 * category cards, the oversized carousel dots and the missing second screen.
 *
 * It also asserts the things a screenshot cannot show you: that the page is
 * actually painted rather than a shell, that the theme really applied, and that
 * nothing rendered "[object Object]" — the shape every DTO bug here has taken.
 *
 * Images are waited for explicitly. The admin thumbnails looked broken in an
 * earlier capture purely because the shot fired before they faded in.
 */

const LOCALES = ['en', 'tr', 'ar'] as const;
const THEMES = ['light', 'dark'] as const;

async function settle(page: Page) {
  // Scroll the whole page first. Product and category images are `loading="lazy"`,
  // so anything below the fold never begins loading and `complete` stays false
  // forever — waiting on it without scrolling just times out.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });

  // Now every image has been asked for: wait for each to finish or fail.
  await page.waitForFunction(
    () => Array.from(document.images).every((img) => img.complete),
    undefined,
    { timeout: 30_000 },
  );
  // Let the fade-in transitions land.
  await page.waitForTimeout(500);
}

async function applyTheme(page: Page, theme: (typeof THEMES)[number]) {
  await page.evaluate((t) => {
    localStorage.setItem('theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
}

/** The pages a buyer can reach, discovered rather than hardcoded. */
async function publicPaths(page: Page, locale: string) {
  await page.goto(`/${locale}/catalogue`, { waitUntil: 'load' });
  const category = await page
    .locator(`a[href^="/${locale}/catalogue/"]`)
    .first()
    .getAttribute('href');

  let product: string | null = null;
  if (category) {
    await page.goto(category, { waitUntil: 'load' });
    product = await page.locator(`a[href^="/${locale}/product/"]`).first().getAttribute('href');
  }

  return [
    { name: 'home', path: `/${locale}` },
    { name: 'catalogue', path: `/${locale}/catalogue` },
    { name: 'about', path: `/${locale}/about` },
    { name: 'contact', path: `/${locale}/contact` },
    ...(category ? [{ name: 'category', path: category }] : []),
    ...(product ? [{ name: 'product', path: product }] : []),
  ];
}

for (const locale of LOCALES) {
  for (const theme of THEMES) {
    test(`${locale} / ${theme}: every page paints`, async ({ page }) => {
      test.setTimeout(120_000);

      const pages = await publicPaths(page, locale);
      expect(pages.length, `no pages discovered for ${locale}`).toBeGreaterThanOrEqual(5);

      for (const { name, path } of pages) {
        await page.goto(path, { waitUntil: 'load' });
        await applyTheme(page, theme);
        await page.reload({ waitUntil: 'load' });
        await settle(page);

        // Painted, not a shell: an h1 and real body text.
        await expect(page.locator('h1').first()).toBeVisible();
        const text = await page.locator('body').innerText();
        expect(text.length, `${path} rendered almost nothing`).toBeGreaterThan(200);
        expect(text, `${path} leaked a stringified object`).not.toContain('[object Object]');

        // The theme actually applied — otherwise every "dark" shot is a light one.
        const isDark = await page.evaluate(() =>
          document.documentElement.classList.contains('dark'),
        );
        expect(isDark, `${path} did not apply the ${theme} theme`).toBe(theme === 'dark');

        // Direction follows the locale.
        const dir = await page.evaluate(() => document.documentElement.dir);
        expect(dir, `${path} direction`).toBe(locale === 'ar' ? 'rtl' : 'ltr');

        await page.screenshot({
          path: `test-results/visual/${locale}-${theme}-${name}.png`,
          fullPage: true,
        });
      }
    });
  }
}
