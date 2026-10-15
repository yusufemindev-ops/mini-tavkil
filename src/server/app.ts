import { Hono } from 'hono';
import { toErrorResponse } from '@/lib/api/errors';
import type { AppEnv } from '@/server/factory';
import { adminAuditLogsRoutes } from '@/server/routes/admin/audit-logs';
import { adminCategoriesRoutes } from '@/server/routes/admin/categories';
import { adminCurrenciesRoutes, adminFxRoutes } from '@/server/routes/admin/currencies';
import { adminDashboardRoutes } from '@/server/routes/admin/dashboard';
import { adminMeRoutes } from '@/server/routes/admin/me';
import { adminMediaRoutes } from '@/server/routes/admin/media';
import { adminProductsRoutes } from '@/server/routes/admin/products';
import { adminSettingsRoutes } from '@/server/routes/admin/settings';
import { adminSuppliersRoutes } from '@/server/routes/admin/suppliers';
import {
  adminPermissionsRoutes,
  adminRolesRoutes,
  adminUsersRoutes,
} from '@/server/routes/admin/users';
import { authRoutes } from '@/server/routes/auth';
import { createDocsRoutes } from '@/server/routes/docs';
import { healthRoutes } from '@/server/routes/health';

/**
 * Root Hono backend application serving all `/api/*` endpoints.
 */
export const app = new Hono<AppEnv>().basePath('/api');

// Hydrate process.env from Worker bindings (`c.env`) when invoked via Hono CLI or standalone Worker.
app.use('*', async (c, next) => {
  if (c.env && typeof c.env === 'object') {
    for (const [key, value] of Object.entries(c.env)) {
      if (typeof value === 'string' && !process.env[key]) {
        process.env[key] = value;
      }
    }
  }
  await next();
});

app.onError((err) => toErrorResponse(err));

app.notFound((c) =>
  c.json({ error: { code: 'resource.not_found', message: 'Endpoint not found.' } }, 404),
);

const _routes = app
  .route('/health', healthRoutes)
  .route('/auth', authRoutes)
  .route('/admin/me', adminMeRoutes)
  .route('/admin/dashboard', adminDashboardRoutes)
  .route('/admin/categories', adminCategoriesRoutes)
  .route('/admin/products', adminProductsRoutes)
  .route('/admin/suppliers', adminSuppliersRoutes)
  .route('/admin/currencies', adminCurrenciesRoutes)
  .route('/admin/fx', adminFxRoutes)
  .route('/admin/settings', adminSettingsRoutes)
  .route('/admin/users', adminUsersRoutes)
  .route('/admin/roles', adminRolesRoutes)
  .route('/admin/permissions', adminPermissionsRoutes)
  .route('/admin/media', adminMediaRoutes)
  .route('/admin/audit-logs', adminAuditLogsRoutes)
  .route('/', createDocsRoutes(app));

export type AppType = typeof _routes;

export default app;
