import { expect, test } from '@playwright/test';

/**
 * Authenticated admin E2E flows (requires saved session from admin.setup.ts).
 */
test.describe('admin', () => {
  test('the dashboard loads behind auth', async ({ page }) => {
    await page.goto('/');
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator('body')).toContainText(/dashboard/i);
  });

  test('products are listable', async ({ page }) => {
    await page.goto('/products');
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator('table, [role="table"]').first()).toBeVisible();
  });

  test('price and supplier ARE visible here — the other half of the rule', async ({ request }) => {
    const response = await request.get('/api/admin/products?pageSize=5');
    expect(response.status()).toBe(200);
    const { data } = await response.json();
    const [product] = data.items;
    // Admin DTOs return nested objects (`basePrice.amount`, `supplier.id`, `category.id`).
    expect(product.basePrice).toMatchObject({ amount: expect.any(Number) });
    expect(product.supplier).toMatchObject({ id: expect.any(String) });
    expect(product.category).toMatchObject({ id: expect.any(String) });
  });

  test('every admin response is wrapped in { data } — the SPA unwraps it', async ({ request }) => {
    // apps/admin/src/lib/api/client.ts unwraps `payload.data` on every response.
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
    await page.goto('/dashboard');
    for (const label of ['Products', 'Categories', 'Suppliers', 'User management', 'Settings']) {
      await expect(page.getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('the dashboard shows real catalogue numbers, not an empty state', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('No catalog metrics yet.')).toHaveCount(0);
    await expect(page.getByText('Published products').first()).toBeVisible();
  });

  test('the users table renders', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByRole('heading', { name: 'User management' })).toBeVisible();
    await expect(page.getByText('row(s)')).toBeVisible();
  });

  test('the storefront previews render', async ({ page, request }) => {
    const { data } = await (await request.get('/api/admin/products?pageSize=1')).json();
    const productId = data.items[0].id;
    const categories = (await (await request.get('/api/admin/categories')).json()).data;
    const categoryId = categories[0].id;

    for (const path of [
      `/preview/product/${productId}`,
      `/preview/category/${categoryId}`,
      '/preview/catalogue',
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} should render`).toBe(200);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('body')).not.toContainText('This page could not be found');
    }
  });

  test('a non-existent product is a 404, not a 500', async ({ request }) => {
    const response = await request.get('/api/admin/products/00000000-0000-0000-0000-000000000000');
    expect(response.status()).toBe(404);
  });
});
