import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * Every admin endpoint, exercised.
 *
 * Written after a run of bugs that all shared one shape: an endpoint returned
 * 200 with a body the SPA could not read, and nothing anywhere failed. The
 * dashboard rendered its empty state against real numbers; the sidebar hid every
 * link; the products table showed "—" in three columns; the users page crashed to
 * a white screen. A 200 is not a passing test — the *shape* is the contract.
 *
 * So each endpoint is checked for four things:
 *   1. it refuses an unauthenticated caller
 *   2. it answers 200 wrapped in `{ data }` — the SPA does `payload.data`
 *   3. the payload has the fields the admin actually reads
 *   4. bad input is a 4xx with a usable message, not a 500
 *
 * Every row created here is prefixed `e2e-` and deleted in teardown whether the
 * test passed or failed. There is one database and no staging (CLAUDE.md §7).
 */
const E2E = 'e2e-contract';

/** Unwrap and assert the envelope in one step. */
async function get<T = unknown>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(path);
  expect(response.status(), `GET ${path}`).toBe(200);
  const body = await response.json();
  expect(body, `GET ${path} must be wrapped in { data }`).toHaveProperty('data');
  return body.data as T;
}

test.describe('admin API contract', () => {
  test('every admin endpoint refuses an unauthenticated caller', async ({ playwright }) => {
    // Explicitly EMPTY storage state. Omitting the option is not enough — the
    // project's `use.storageState` is inherited, so the "anonymous" context
    // arrived holding the admin cookie and every endpoint answered 200. The test
    // was wrong, not the server; curl with no cookie returns 401 throughout.
    const anon = await playwright.request.newContext({
      baseURL: test.info().project.use.baseURL,
      storageState: { cookies: [], origins: [] },
    });
    const paths = [
      '/api/admin/me',
      '/api/admin/products',
      '/api/admin/products/counts',
      '/api/admin/categories',
      '/api/admin/suppliers',
      '/api/admin/users',
      '/api/admin/roles',
      '/api/admin/settings',
      '/api/admin/dashboard',
      '/api/admin/currencies',
      '/api/admin/fx/runs',
      '/api/admin/permissions/catalog',
    ];
    for (const path of paths) {
      const response = await anon.get(path);
      expect([401, 403], `${path} must not serve an anonymous caller`).toContain(response.status());
    }
    await anon.dispose();
  });

  test('read endpoints answer with the shape the dashboard reads', async ({ request }) => {
    const me = await get<{ permissions: string[]; roles: unknown[]; assignedRoles: unknown[] }>(
      request,
      '/api/admin/me',
    );
    // The sidebar is gated on these; an empty array hides every nav entry.
    expect(me.permissions.length).toBeGreaterThan(0);
    expect(Array.isArray(me.roles)).toBe(true);
    expect(Array.isArray(me.assignedRoles)).toBe(true);

    const dashboard = await get<{ kpis: unknown[]; publishSummary: unknown[] }>(
      request,
      '/api/admin/dashboard',
    );
    expect(dashboard.kpis.length).toBeGreaterThan(0);
    expect(dashboard.publishSummary.length).toBeGreaterThan(0);

    // `all`, not `total` — the products page reads `counts.all` for its subtitle.
    const counts = await get<Record<string, number>>(request, '/api/admin/products/counts');
    expect(counts).toHaveProperty('all');
    expect(counts).toHaveProperty('published');
    expect(counts).toHaveProperty('draft');

    const roles = await get<{ id: string; name: string; permissions: string[] }[]>(
      request,
      '/api/admin/roles',
    );
    // Rendered as `role.name` keyed on `role.id`; both blank made the picker
    // look populated and be unusable.
    for (const role of roles) {
      expect(role.id, 'role needs an id').toBeTruthy();
      expect(role.name, 'role needs a name').toBeTruthy();
      expect(Array.isArray(role.permissions)).toBe(true);
    }

    const users = await get<{ status: string; role: unknown }[]>(request, '/api/admin/users');
    for (const user of users) {
      // `STATUS_BADGE[user.status]` — an absent status threw and killed the page.
      expect(['active', 'invited', 'suspended']).toContain(user.status);
    }

    const settings = await get<Record<string, unknown>>(request, '/api/admin/settings');
    for (const key of ['siteName', 'whatsappNumber', 'contactEmail', 'inquiryEmail']) {
      expect(settings, `settings.${key} must always be present`).toHaveProperty(key);
    }

    await get(request, '/api/admin/currencies');
    await get(request, '/api/admin/fx/runs');
    await get(request, '/api/admin/permissions/catalog');
    await get(request, '/api/admin/suppliers');
  });

  test('the products list carries the objects the table renders', async ({ request }) => {
    const page = await get<{ items: Record<string, unknown>[]; total: number }>(
      request,
      '/api/admin/products?page=1&pageSize=5&sort=recent',
    );
    expect(page.total).toBeGreaterThan(0);
    const [product] = page.items;

    // These three are why every Sub-category and Base price cell read "—".
    expect(product.category).toMatchObject({ id: expect.any(String) });
    expect(product.supplier).toMatchObject({ id: expect.any(String) });
    expect(product.basePrice).toMatchObject({ amount: expect.any(Number) });
    // Admin-only data must be here — the public leak test means nothing unless
    // the same fields are proven present for an authenticated admin.
    expect(Array.isArray(product.translations)).toBe(true);
    expect(Array.isArray(product.images)).toBe(true);
  });

  test('pagination, filtering and sorting change the result', async ({ request }) => {
    const all = await get<{ items: unknown[]; total: number }>(
      request,
      '/api/admin/products?page=1&pageSize=50',
    );
    const firstPage = await get<{ items: unknown[]; page: number; pageSize: number }>(
      request,
      '/api/admin/products?page=1&pageSize=2',
    );
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.pageSize).toBe(2);

    const published = await get<{ total: number }>(
      request,
      '/api/admin/products?status=published&pageSize=50',
    );
    expect(published.total).toBeLessThanOrEqual(all.total);

    const bySku = await get<{ items: { sku: string }[] }>(
      request,
      '/api/admin/products?sort=sku&pageSize=50',
    );
    const skus = bySku.items.map((item) => item.sku).filter(Boolean);
    expect([...skus].sort()).toEqual(skus);

    // A search that matches nothing is an empty list, not an error.
    const none = await get<{ items: unknown[]; total: number }>(
      request,
      '/api/admin/products?search=zzz-no-such-product-zzz',
    );
    expect(none.items).toEqual([]);
    expect(none.total).toBe(0);
  });

  test('unknown ids are 404, malformed ids are not 500', async ({ request }) => {
    const missing = '00000000-0000-0000-0000-000000000000';
    for (const path of [
      `/api/admin/products/${missing}`,
      `/api/admin/categories/${missing}`,
      `/api/admin/suppliers/${missing}`,
    ]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
    for (const path of ['/api/admin/products/not-a-uuid', '/api/admin/categories/not-a-uuid']) {
      const status = (await request.get(path)).status();
      expect(status, `${path} should be a handled 4xx`).toBeGreaterThanOrEqual(400);
      expect(status, `${path} must not be a 500`).toBeLessThan(500);
    }
  });

  test('invalid bodies are rejected with a usable message', async ({ request }) => {
    // NOT an empty body: create is deliberately draft-first (see
    // services/catalog-schemas.ts) — a blank row is savable and the publish gate
    // is what demands an English name and slug. Asserting 4xx on `{}` was my
    // misreading, and it left two nameless products in the table before I
    // noticed. These are genuinely malformed instead.
    const cases: { path: string; body: unknown }[] = [
      { path: '/api/admin/products', body: { moq: 'not-a-number' } },
      { path: '/api/admin/products', body: { translations: [{ locale: 'xx', name: '' }] } },
      { path: '/api/admin/categories', body: { parentId: 'not-a-uuid' } },
      { path: '/api/admin/suppliers', body: { countryCode: 'TOO-LONG' } },
      { path: '/api/admin/users', body: { email: 'not-an-email', roleId: 'x' } },
    ];
    for (const { path, body } of cases) {
      const response = await request.post(path, { data: body });
      expect(response.status(), `POST ${path} with an invalid body`).toBeGreaterThanOrEqual(400);
      expect(response.status(), `POST ${path} must not 500`).toBeLessThan(500);
      const payload = await response.json();
      expect(payload, `POST ${path} error envelope`).toHaveProperty('error');
      expect(payload.error.message, `POST ${path} needs a message`).toBeTruthy();
    }
  });

  test('a category survives its whole lifecycle and is cleaned up', async ({ request }) => {
    let id: string | undefined;
    try {
      const created = await (async () => {
        const response = await request.post('/api/admin/categories', {
          data: {
            translations: [
              { locale: 'en', name: `${E2E} category`, slug: `${E2E}-category`, isComplete: true },
            ],
          },
        });
        expect(response.status(), 'create category').toBe(200);
        return (await response.json()).data as { id: string; status: string };
      })();
      id = created.id;
      expect(created.status).toBe('draft');

      // Read back
      const read = await get<{ id: string }>(request, `/api/admin/categories/${id}`);
      expect(read.id).toBe(id);

      // Update
      const patch = await request.patch(`/api/admin/categories/${id}`, {
        data: {
          translations: [
            {
              locale: 'en',
              name: `${E2E} renamed`,
              slug: `${E2E}-category`,
              isComplete: true,
            },
          ],
        },
      });
      expect(patch.status(), 'update category').toBe(200);

      // Publish → unpublish. Publishing runs the readiness gate, so a 422 here is
      // a legitimate answer for an incomplete record — but never a 500.
      const publish = await request.post(`/api/admin/categories/${id}/publish`);
      expect(publish.status(), 'publish must not 500').toBeLessThan(500);
      if (publish.ok()) {
        const unpublish = await request.post(`/api/admin/categories/${id}/unpublish`);
        expect(unpublish.status()).toBe(200);
      }
    } finally {
      if (id) {
        const deleted = await request.delete(`/api/admin/categories/${id}`);
        expect(deleted.status(), 'teardown must remove the row').toBe(200);
        expect((await request.get(`/api/admin/categories/${id}`)).status()).toBe(404);
      }
    }
  });

  test('a supplier survives its whole lifecycle and is cleaned up', async ({ request }) => {
    let id: string | undefined;
    try {
      const response = await request.post('/api/admin/suppliers', {
        data: {
          countryCode: 'TR',
          translations: [
            { locale: 'en', name: `${E2E} supplier`, slug: `${E2E}-supplier`, isComplete: true },
          ],
        },
      });
      expect(response.status(), 'create supplier').toBe(200);
      id = ((await response.json()).data as { id: string }).id;

      await get(request, `/api/admin/suppliers/${id}`);
      const publish = await request.post(`/api/admin/suppliers/${id}/publish`);
      expect(publish.status(), 'publish must not 500').toBeLessThan(500);
    } finally {
      if (id) {
        expect((await request.delete(`/api/admin/suppliers/${id}`)).status()).toBe(200);
      }
    }
  });

  test('settings round-trip: what is written is what is read back', async ({ request }) => {
    const before = await get<Record<string, string>>(request, '/api/admin/settings');
    try {
      const marker = `${E2E}-site`;
      const patch = await request.patch('/api/admin/settings', { data: { siteName: marker } });
      expect(patch.status()).toBe(200);
      const after = await get<Record<string, string>>(request, '/api/admin/settings');
      expect(after.siteName).toBe(marker);
      // Untouched fields must survive a partial PATCH — a merge bug here silently
      // wipes the contact details.
      expect(after.contactEmail).toBe(before.contactEmail);
    } finally {
      await request.patch('/api/admin/settings', { data: { siteName: before.siteName } });
      const restored = await get<Record<string, string>>(request, '/api/admin/settings');
      expect(restored.siteName, 'teardown must restore the real site name').toBe(before.siteName);
    }
  });

  test('an admin edit reaches the storefront within seconds, not an hour', async ({ request }) => {
    // Public pages are revalidate=3600. Without on-demand invalidation an admin
    // waits out that window, which is indistinguishable from "saving is broken".
    const page = await get<{
      items: {
        id: string;
        translations: { locale: string; name: string; slug: string; description: string | null }[];
      }[];
    }>(request, '/api/admin/products?pageSize=1&sort=recent');
    const product = page.items[0];
    const en = product.translations.find((t) => t.locale === 'en')!;
    const marker = `${E2E}-revalidation`;

    try {
      const patch = await request.patch(`/api/admin/products/${product.id}`, {
        data: {
          translations: [
            {
              locale: 'en',
              name: `${en.name} ${marker}`,
              slug: en.slug,
              description: en.description ?? '',
              isComplete: true,
            },
          ],
        },
      });
      expect(patch.status()).toBe(200);

      await expect
        .poll(
          async () => (await (await request.get(`/en/product/${en.slug}`)).text()).includes(marker),
          { timeout: 20_000, message: 'the storefront should reflect the edit within 20s' },
        )
        .toBe(true);
    } finally {
      await request.patch(`/api/admin/products/${product.id}`, {
        data: {
          translations: [
            {
              locale: 'en',
              name: en.name,
              slug: en.slug,
              description: en.description ?? '',
              isComplete: true,
            },
          ],
        },
      });
    }
  });
});
