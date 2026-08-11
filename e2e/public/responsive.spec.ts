import { expect, test } from '@playwright/test';

/**
 * Responsive behaviour of the storefront.
 *
 * The existing a11y spec checks 375px for horizontal overflow, which catches the
 * worst failure but not the ones that make a page unusable while still fitting:
 * a nav that never collapses, a grid that stays four-across on a phone, tap
 * targets too small to hit, or the RTL layout breaking at a breakpoint the LTR
 * one survives.
 *
 * Arabic is included at every size deliberately. RTL plus a media query is where
 * layout bugs actually live, and it is the locale least likely to be opened by
 * hand before a release.
 */
const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'phone-large', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1920, height: 1080 },
] as const;

const PATHS = ['', '/catalogue', '/about', '/contact'] as const;

for (const viewport of VIEWPORTS) {
  for (const locale of ['en', 'ar'] as const) {
    test(`${viewport.name} ${locale}: no page scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const path of PATHS) {
        await page.goto(`/${locale}${path}`, { waitUntil: 'networkidle' });

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(
          overflow,
          `/${locale}${path} at ${viewport.width}px overflows by ${overflow}px`,
        ).toBeLessThanOrEqual(1);

        // Nothing INTERACTIVE may stick out past the viewport — an element can
        // escape horizontally without scrolling the document if an ancestor clips.
        // `pointer-events: none` is skipped on purpose: the hero's ambient glow
        // bleeds 4% past the stage by design (tv-showcase.module.css), cannot be
        // touched, and causes no scrolling. Flagging it would mean either
        // deleting the effect or ignoring the test.
        const escaping = await page.evaluate((width) => {
          const offenders: string[] = [];
          for (const el of document.body.querySelectorAll('*')) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            if (getComputedStyle(el).pointerEvents === 'none') continue;
            if (rect.right > width + 2 || rect.left < -2) {
              offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
              if (offenders.length > 3) break;
            }
          }
          return offenders;
        }, viewport.width);
        expect(escaping, `/${locale}${path} at ${viewport.width}px`).toEqual([]);
      }
    });
  }
}

test('the nav collapses to a menu button on a phone and is a full bar on desktop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/en');
  const burger = page.getByRole('button', { name: /menu/i });
  await expect(burger).toBeVisible();

  // Opening it must actually reveal the links, not just toggle a class.
  await burger.click();
  await expect(page.getByRole('link', { name: 'Catalogue' }).first()).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/en');
  await expect(page.getByRole('button', { name: /menu/i })).toBeHidden();
  await expect(page.getByRole('link', { name: 'Catalogue' }).first()).toBeVisible();
});

test('the catalogue rail becomes a dropdown below lg', async ({ page }) => {
  // Two different components render the same navigation; only one may be visible
  // at a time or the page has it twice in the accessibility tree.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/en/catalogue');
  await expect(page.getByRole('navigation', { name: 'Categories' })).toBeHidden();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/en/catalogue');
  await expect(page.getByRole('navigation', { name: 'Categories' })).toBeVisible();
});

for (const path of ['', '/catalogue', '/about', '/contact']) {
  test(`tap targets on a phone are big enough to hit${path || ' (home)'}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/en${path}`, { waitUntil: 'networkidle' });

    // 24px is the WCAG 2.2 minimum (2.5.8). Inline links inside a paragraph are
    // exempt — the rule targets standalone controls. This found the hero's 9px
    // carousel dots, 20px breadcrumbs and 22px "View all" links.
    const small = await page.evaluate(() => {
      const offenders: string[] = [];
      for (const el of document.querySelectorAll('button, a[href]')) {
        if (el.closest('p')) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.height < 24 || rect.width < 24) {
          offenders.push(
            `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 20)}" ` +
              `${Math.round(rect.width)}×${Math.round(rect.height)}`,
          );
        }
      }
      return offenders;
    });
    expect(small, `/en${path}`).toEqual([]);
  });
}
