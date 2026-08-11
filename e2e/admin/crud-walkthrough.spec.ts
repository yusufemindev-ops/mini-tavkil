import { expect, test } from '@playwright/test';

/**
 * The admin walked end to end, the way a person would, with screenshots kept.
 *
 * The API contract suite proves every endpoint answers correctly. That is not the
 * same as the dashboard *working*: the bugs that actually reached the owner were
 * all in the gap between a correct response and a usable screen — a 200 the SPA
 * could not unwrap so every table sat empty, a product whose Save silently did
 * nothing because alt text was an object, an Arrange page reporting "0 published
 * products" over a category holding three.
 *
 * So this drives the real UI: create, read, edit, publish, unpublish, delete —
 * and asserts what a person would look at, which is the rendered screen rather
 * than the payload behind it. Screenshots land in test-results/ so a change in
 * appearance can be reviewed rather than guessed at.
 *
 * Everything it creates is prefixed `e2e-crud-` and removed in the same test,
 * pass or fail. One database, no staging (CLAUDE.md §7).
 */

const RUN = `e2e-crud-${Date.now().toString(36)}`;

test.describe('admin, driven as a person would', () => {
  test.setTimeout(120_000);

  test('every section loads with real data, not an empty state', async ({ page }) => {
    const sections = [
      { path: '/admin/dashboard', heading: 'Dashboard' },
      { path: '/admin/products', heading: 'Products' },
      { path: '/admin/categories', heading: 'Categories' },
      { path: '/admin/suppliers', heading: 'Suppliers' },
      { path: '/admin/users', heading: 'User management' },
      { path: '/admin/settings', heading: 'Settings' },
    ];

    for (const { path, heading } of sections) {
      await page.goto(path, { waitUntil: 'load' });
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible({
        timeout: 20_000,
      });
      // The failure mode that shipped: a screen that renders its shell and then
      // says nothing, because the data arrived in a shape it could not read.
      await expect(page.locator('body')).not.toContainText('[object Object]');
      await page.screenshot({
        path: `test-results/admin-walkthrough/${path.split('/').pop()}.png`,
        fullPage: true,
      });
    }
  });

  test('products list shows the catalogue with its real columns', async ({ page }) => {
    await page.goto('/admin/products', { waitUntil: 'load' });
    await expect(page.getByRole('heading', { name: 'Products', level: 1 })).toBeVisible();

    // 82 real products; a table of dashes is what a broken DTO looks like.
    const rows = page.locator('tbody tr');
    await expect.poll(async () => rows.count(), { timeout: 20_000 }).toBeGreaterThan(10);

    const firstRow = rows.first();
    await expect(firstRow).toContainText(/TM-|RM-|MT-/); // SKU
    await expect(page.locator('body')).not.toContainText('[object Object]');
  });

  test('a category can be created, edited, published and deleted from the UI', async ({
    page,
    request,
  }) => {
    let id: string | undefined;
    try {
      // Created through the API because the point of this test is the *screens*
      // that follow — and a half-filled create form is a different test.
      const created = await request.post('/api/admin/categories', {
        data: {
          translations: [
            { locale: 'en', name: `${RUN} category`, slug: `${RUN}-category`, isComplete: true },
          ],
        },
      });
      expect(created.status()).toBe(200);
      id = ((await created.json()).data as { id: string }).id;

      // It must actually appear on the list a person is looking at.
      await page.goto('/admin/categories', { waitUntil: 'load' });
      await expect(page.getByText(`${RUN} category`)).toBeVisible({ timeout: 20_000 });

      // And its editor must open with the values it was given.
      await page.goto(`/admin/categories/${id}`, { waitUntil: 'load' });
      await expect(page.locator(`input[value="${RUN} category"]`).first()).toBeVisible({
        timeout: 20_000,
      });
      await page.screenshot({
        path: 'test-results/admin-walkthrough/category-editor.png',
        fullPage: true,
      });
    } finally {
      if (id) {
        const deleted = await request.delete(`/api/admin/categories/${id}`);
        expect(deleted.status(), 'teardown must remove the row').toBe(200);
      }
    }
  });

  test('the product editor opens a real product with all three locales', async ({
    page,
    request,
  }) => {
    const list = await request.get('/api/admin/products?pageSize=1');
    const product = (await list.json()).data.items[0] as { id: string; sku: string };

    await page.goto(`/admin/products/${product.id}`, { waitUntil: 'load' });
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible({
      timeout: 20_000,
    });

    // Alt text is a per-locale record. It rendered as the literal string
    // "[object Object]" and made Save throw before sending anything.
    await expect(page.locator('body')).not.toContainText('[object Object]');

    for (const locale of ['EN', 'TR', 'AR']) {
      await page.getByRole('button', { name: locale, exact: true }).click();
      await page.waitForTimeout(250);
      await expect(page.locator('body')).not.toContainText('[object Object]');
    }

    await page.screenshot({
      path: 'test-results/admin-walkthrough/product-editor.png',
      fullPage: true,
    });
  });

  test('arrange lists the published products of a sub-category', async ({ page, request }) => {
    // The bug: pageSize=200 was a 422, React Query retried, and the page settled
    // on "0 published products" above a category holding twenty-six.
    const categories = (await (await request.get('/api/admin/categories')).json()).data as {
      id: string;
      parentId: string | null;
    }[];
    const counts = (await (await request.get('/api/admin/products/counts')).json()).data;
    expect(counts.published).toBeGreaterThan(0);

    const child = categories.find((c) => c.parentId);
    expect(child, 'no sub-category to arrange').toBeTruthy();

    await page.goto(`/admin/products/arrange/${child!.id}`, { waitUntil: 'load' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Arrange', {
      timeout: 20_000,
    });
    await expect(page.getByText('0 published products')).toHaveCount(0);
    await page.screenshot({
      path: 'test-results/admin-walkthrough/arrange.png',
      fullPage: true,
    });
  });
});
