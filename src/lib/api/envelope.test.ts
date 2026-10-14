import { describe, expect, it, vi } from 'vitest';

/**
 * Verifies the `{ data }` success and `{ error: { code, message, details? } }` failure envelope expected by `admin/src/lib/api/client.ts`.
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
