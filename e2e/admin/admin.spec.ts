import { expect, test } from '@playwright/test';

/**
 * Admin flows. These need a saved session — see admin.setup.ts — and are skipped
 * with an explanation rather than failing when there isn't one, so a missing
 * Google login never looks like a broken build.
 *
 * The assertions worth having here are the ones the public suite structurally
 * cannot make: that price and supplier ARE visible to an authenticated admin.
 * Proving the data is absent publicly means little unless it is present here —
 * otherwise a query that returned nothing at all would pass every leak test.
 */
test.describe('admin', () => {
  test('the dashboard loads behind auth', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator('body')).toContainText(/dashboard/i);
  });

  test('products are listable', async ({ page }) => {
    await page.goto('/admin/products');
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();
  });

  test('price and supplier ARE visible here — the other half of the rule', async ({ request }) => {
    const response = await request.get('/api/admin/products?pageSize=5');
    expect(response.status()).toBe(200);
    const { data } = await response.json();
    const [product] = data.items;
    // The public shape has no field for these at all; the admin shape must, and
    // as OBJECTS — `basePrice.amount`, `supplier.name` — because that is what
    // Tavkil's admin SPA reads. Asserting on the raw string missed the day these
    // were `basePriceAmount` / `supplierId` and every table cell showed "—".
    expect(product.basePrice).toMatchObject({ amount: expect.any(Number) });
    expect(product.supplier).toMatchObject({ id: expect.any(String) });
    expect(product.category).toMatchObject({ id: expect.any(String) });
  });

  test('every admin response is wrapped in { data } — the SPA unwraps it', async ({ request }) => {
    // admin/src/lib/api/client.ts returns `payload.data`. A bare body resolves to
    // `undefined` in the SPA with a 200 and no error: the dashboard renders its
    // empty state and the sidebar hides every entry. Cheap to assert, expensive
    // to rediscover.
    for (const path of ['/api/admin/categories', '/api/admin/suppliers', '/api/admin/me']) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(await response.json(), path).toHaveProperty('data');
    }
  });

  test('categories are listable and the catalogue is editable', async ({ request }) => {
    const response = await request.get('/api/admin/categories');
    expect(response.status()).toBe(200);
    const { data } = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('the sidebar shows every section an Owner may reach', async ({ page }) => {
    // The permissions round-trip is what decides this. When /admin/me returned
    // nothing usable, RequirePermission hid all of these and the dashboard looked
    // like an unfinished build.
    await page.goto('/admin/dashboard');
    for (const label of ['Products', 'Categories', 'Suppliers', 'User management', 'Settings']) {
      await expect(page.getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('the dashboard shows real catalogue numbers, not an empty state', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByText('No catalog metrics yet.')).toHaveCount(0);
    await expect(page.getByText('Published products').first()).toBeVisible();
  });

  test('the users table renders — it crashed to a white screen once', async ({ page }) => {
    // `STATUS_BADGE[member.status].variant` threw when the DTO had no `status`,
    // killing the whole route rather than one cell.
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'User management' })).toBeVisible();
    await expect(page.getByText('row(s)')).toBeVisible();
  });

  test("the storefront previews render — every Preview button 404'd", async ({ page, request }) => {
    // `window.open('/preview/…')` bypasses React Router's basename, so all five
    // Preview buttons opened `https://host/preview/…` and hit the Next 404
    // instead of `/admin/preview/…`. Correct in Tavkil, where the admin sat at
    // its own origin root; wrong the moment it is mounted under /admin.
    const { data } = await (await request.get('/api/admin/products?pageSize=1')).json();
    const productId = data.items[0].id;
    const categories = (await (await request.get('/api/admin/categories')).json()).data;
    const categoryId = categories[0].id;

    for (const path of [
      `/admin/preview/product/${productId}`,
      `/admin/preview/category/${categoryId}`,
      '/admin/preview/catalogue',
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} should render`).toBe(200);
      await expect(page).not.toHaveURL(/admin\/login/);
      // The SPA shell resolves the route client-side; a 404 renders Next's own
      // "This page could not be found", which the shell never contains.
      await expect(page.locator('body')).not.toContainText('This page could not be found');
    }
  });

  test('a non-existent product is a 404, not a 500', async ({ request }) => {
    const response = await request.get('/api/admin/products/00000000-0000-0000-0000-000000000000');
    expect(response.status()).toBe(404);
  });
});
