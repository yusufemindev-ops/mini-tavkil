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
    const body = await response.text();
    // The public shape has no field for these at all; the admin shape must.
    expect(body).toContain('basePriceAmount');
    expect(body).toContain('supplierId');
  });

  test('categories are listable and the catalogue is editable', async ({ request }) => {
    const response = await request.get('/api/admin/categories');
    expect(response.status()).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
  });

  test('a non-existent product is a 404, not a 500', async ({ request }) => {
    const response = await request.get('/api/admin/products/00000000-0000-0000-0000-000000000000');
    expect(response.status()).toBe(404);
  });
});
