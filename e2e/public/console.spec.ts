import { expect, test, type ConsoleMessage, type Page, type Request } from '@playwright/test';

/**
 * Every public page, in every locale, with the console and the network watched.
 *
 * This exists because of `ReferenceError: __name is not defined`. It threw on
 * every single page load for the life of the deployment, and it killed
 * next-themes' no-flash script one line before it applied the theme — so the
 * flash prevention never ran in production. Nothing caught it: the pages
 * rendered, the tests passed, and the error only surfaced when Lighthouse
 * happened to report console output.
 *
 * A page that renders is not a page that works. Anything a browser logs as an
 * error, or any request it could not complete, fails the run here.
 */

const LOCALES = ['en', 'tr', 'ar'] as const;

/**
 * Noise that is not ours and cannot be fixed from this codebase.
 *
 * Deliberately short and specific — a broad filter here would hide exactly the
 * class of bug this file was written to catch.
 */
const IGNORED = [
  // Chrome logs this for any cross-origin image served without CORP headers;
  // R2's public bucket does not send them and the images render regardless.
  /Failed to load resource: net::ERR_BLOCKED_BY_RESPONSE/i,
  // Devtools/extension chatter in a headed run.
  /^chrome-extension:/i,
  /**
   * Next prefetches the routes a page links to as `?_rsc=` requests, and cancels
   * whatever is still in flight when navigation moves on. An aborted prefetch is
   * the router working, not a broken request — a catalogue page links to fourteen
   * sub-categories and abandons most of them the moment you click one.
   *
   * Scoped to prefetches on purpose: an aborted request for anything else is
   * still a failure.
   */
  /^net::ERR_ABORTED .*[?&]_rsc=/i,
];

const isIgnored = (text: string) => IGNORED.some((pattern) => pattern.test(text));

function watch(page: Page) {
  const errors: string[] = [];
  const failed: string[] = [];

  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (!isIgnored(text)) errors.push(text);
  });
  page.on('pageerror', (error) => {
    if (!isIgnored(error.message)) errors.push(`uncaught: ${error.message}`);
  });
  page.on('requestfailed', (request: Request) => {
    const text = `${request.failure()?.errorText} ${request.url()}`;
    if (!isIgnored(text)) failed.push(text);
  });

  return { errors, failed };
}

/** A product and a category slug per locale, found the way a crawler would. */
async function deepLinks(page: Page, locale: string) {
  await page.goto(`/${locale}/catalogue`, { waitUntil: 'load' });
  const category = await page
    .locator(`a[href^="/${locale}/catalogue/"]`)
    .first()
    .getAttribute('href');
  if (!category) return { category: null, product: null };

  await page.goto(category, { waitUntil: 'load' });
  const product = await page.locator(`a[href^="/${locale}/product/"]`).first().getAttribute('href');
  return { category, product };
}

for (const locale of LOCALES) {
  // Six full navigations against a remote Worker; the 30s default is not enough.
  test.setTimeout(90_000);

  test(`${locale}: no console errors or failed requests on any public page`, async ({ page }) => {
    const { errors, failed } = watch(page);

    const { category, product } = await deepLinks(page, locale);
    expect(category, `no category link found in ${locale}`).toBeTruthy();
    expect(product, `no product link found under ${category}`).toBeTruthy();

    const paths = [
      `/${locale}`,
      `/${locale}/catalogue`,
      `/${locale}/about`,
      `/${locale}/contact`,
      category!,
      product!,
    ];

    for (const path of paths) {
      await page.goto(path, { waitUntil: 'load' });
      // Give client components a beat to hydrate and throw if they are going to.
      await page.waitForTimeout(400);
    }

    expect(errors, `console errors in ${locale}:\n${errors.join('\n')}`).toEqual([]);
    expect(failed, `failed requests in ${locale}:\n${failed.join('\n')}`).toEqual([]);
  });
}

test('the machine-readable surfaces answer and are not empty', async ({ request }) => {
  // llms.txt exceeded the Worker subrequest limit once and 500'd in production
  // while every page still rendered; nothing else covers these.
  for (const path of ['/llms.txt', '/llms-full.txt', '/sitemap.xml', '/robots.txt']) {
    const response = await request.get(path);
    expect(response.status(), `${path} status`).toBe(200);
    expect((await response.text()).length, `${path} is empty`).toBeGreaterThan(0);
  }
});
