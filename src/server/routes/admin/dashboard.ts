import { Hono } from 'hono';
import { dashboardSummary } from '@/lib/services/dashboard';
import { adminJson, requireAdminPerm, type AppEnv } from '@/server/factory';

export const adminDashboardRoutes = new Hono<AppEnv>().get(
  '/',
  requireAdminPerm('products:view'),
  async (c) => adminJson(c, await dashboardSummary()),
);
