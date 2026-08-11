import { describe, expect, it, vi } from 'vitest';

/**
 * The admin API speaks Tavkil's envelope: `{ data: … }` on success,
 * `{ error: { code, message, details? } }` on failure.
 *
 * This is not a style preference — it is a contract with code we do not own.
 * `admin/src/lib/api/client.ts` is Tavkil's, and it ends with
 *
 *     return (payload as SuccessEnvelope<T>).data;
 *
 * so a handler that returns the bare value resolves to `undefined` in the SPA.
 * When that happened, every admin screen broke at once and none of them errored:
 * the dashboard showed "No catalog metrics yet" against a 200 carrying real
 * numbers, and `/admin/me` yielded no permissions, so `RequirePermission` hid
 * Products, Categories, Suppliers, Users and Settings. A silent `undefined` is
 * the worst possible failure mode, which is why it is pinned here.
 */
vi.mock('@/lib/auth-guard', () => ({
  requirePermission: vi.fn(async () => ({
    id: 'u1',
    email: 'owner@example.com',
    name: 'Owner',
    image: null,
    banned: false,
  })),
  requireAdmin: vi.fn(async () => ({
    id: 'u1',
    email: 'owner@example.com',
    name: 'Owner',
    image: null,
    banned: false,
  })),
  AuthError: class AuthError extends Error {},
}));

const { adminRoute } = await import('./handler');

describe('adminRoute response envelope', () => {
  it('wraps a plain object in { data }', async () => {
    const route = adminRoute('products:view', async () => ({ total: 12 }));
    const res = await route(new Request('https://x/api/admin/thing'), {
      params: Promise.resolve({}),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: { total: 12 } });
  });

  it('wraps arrays too — a bare array would unwrap to undefined just the same', async () => {
    const route = adminRoute('products:view', async () => [{ id: 'a' }]);
    const res = await route(new Request('https://x/api/admin/list'), {
      params: Promise.resolve({}),
    });

    await expect(res.json()).resolves.toEqual({ data: [{ id: 'a' }] });
  });

  it('never caches an admin response — they carry price and supplier data', async () => {
    const route = adminRoute('products:view', async () => ({ ok: true }));
    const res = await route(new Request('https://x/api/admin/thing'), {
      params: Promise.resolve({}),
    });

    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('passes a handler-built Response through untouched', async () => {
    // Streaming and redirect handlers own their own body; wrapping would corrupt it.
    const route = adminRoute(
      'products:view',
      async () => new Response('raw', { status: 207, headers: { 'X-Test': '1' } }),
    );
    const res = await route(new Request('https://x/api/admin/raw'), {
      params: Promise.resolve({}),
    });

    expect(res.status).toBe(207);
    expect(res.headers.get('X-Test')).toBe('1');
    await expect(res.text()).resolves.toBe('raw');
  });
});
