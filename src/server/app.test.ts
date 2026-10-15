import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { Hono } from 'hono';
import { AuthError, notFound, toErrorResponse } from '@/lib/api/errors';

vi.mock('@/lib/auth-guard', () => ({
  requirePermission: vi.fn(async (_req: Request, permission: string) => {
    if (permission === 'forbidden:perm') {
      throw new AuthError(403, 'Missing permission: forbidden:perm');
    }
    return {
      id: 'u1',
      email: 'owner@example.com',
      name: 'Owner',
      image: null,
      banned: false,
    };
  }),
  requireAdmin: vi.fn(async () => ({
    id: 'u1',
    email: 'owner@example.com',
    name: 'Owner',
    image: null,
    banned: false,
  })),
  permissionsFor: vi.fn(async () => new Set(['products:view', 'categories:view'])),
  rolesFor: vi.fn(async () => ['super_admin']),
}));

const { adminJson, parseJson, requireAdminPerm } = await import('@/server/factory');
const { createDocsRoutes } = await import('@/server/routes/docs');

function buildTestApp() {
  const app = new Hono().basePath('/api');
  app.onError((err) => toErrorResponse(err));
  app.notFound((c) =>
    c.json({ error: { code: 'resource.not_found', message: 'Endpoint not found.' } }, 404),
  );

  const schema = z.object({ name: z.string().min(1) });

  app
    .get('/admin/items', requireAdminPerm('products:view'), (c) => adminJson(c, [{ id: 'item-1' }]))
    .post('/admin/items', requireAdminPerm('products:create'), async (c) => {
      const body = await parseJson(c, schema);
      return adminJson(c, { created: body.name, by: c.var.admin.id }, 201);
    })
    .get('/admin/forbidden', requireAdminPerm('forbidden:perm'), (c) => adminJson(c, { ok: true }))
    .get('/admin/missing', requireAdminPerm('products:view'), () => {
      throw notFound('Item not found.');
    })
    .route('/', createDocsRoutes(app as never));

  return app;
}

describe('Hono server factory & middleware', () => {
  it('wraps admin responses in { data } with private, no-store cache headers', async () => {
    const app = buildTestApp();
    const res = await app.request('/api/admin/items');

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(res.json()).resolves.toEqual({ data: [{ id: 'item-1' }] });
  });

  it('validates JSON body with Zod and injects authenticated admin into c.var.admin', async () => {
    const app = buildTestApp();
    const res = await app.request('/api/admin/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hydraulic Pump' }),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      data: { created: 'Hydraulic Pump', by: 'u1' },
    });
  });

  it('returns 422 validation.failed with field details when Zod validation fails', async () => {
    const app = buildTestApp();
    const res = await app.request('/api/admin/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });

    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      error: { code: string; details: Record<string, string[]> };
    };
    expect(body.error.code).toBe('validation.failed');
    expect(body.error.details).toHaveProperty('name');
  });

  it('returns 422 validation.failed when request body is malformed JSON', async () => {
    const app = buildTestApp();
    const res = await app.request('/api/admin/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });

    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: 'validation.failed',
        message: 'Request body must be valid JSON.',
      },
    });
  });

  it('maps AuthError and AppError to the standard error envelope', async () => {
    const app = buildTestApp();

    const forbidden = await app.request('/api/admin/forbidden');
    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toEqual({
      error: { code: 'auth.denied', message: 'Missing permission: forbidden:perm' },
    });

    const missing = await app.request('/api/admin/missing');
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({
      error: { code: 'resource.not_found', message: 'Item not found.' },
    });
  });

  it('serves dynamic OpenAPI 3.1 spec at /api/openapi.json and interactive explorer at /api/docs', async () => {
    const app = buildTestApp();

    const specRes = await app.request('/api/openapi.json');
    expect(specRes.status).toBe(200);
    const spec = (await specRes.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.paths).toHaveProperty('/api/admin/items');

    const docsRes = await app.request('/api/docs');
    expect(docsRes.status).toBe(200);
    expect(docsRes.headers.get('Content-Type')).toContain('text/html');
    await expect(docsRes.text()).resolves.toContain(
      'Tavkil B2B Wholesale Platform — Hono API Explorer',
    );
  });
});
