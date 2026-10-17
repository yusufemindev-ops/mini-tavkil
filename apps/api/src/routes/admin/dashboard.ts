import { Hono } from 'hono';
import { permissionsFor } from '@/lib/auth-guard';
import { dashboardSummary } from '@/lib/services/dashboard';
import { adminJson, requireAdminSession, type AppEnv } from '@/server/factory';

export const adminDashboardRoutes = new Hono<AppEnv>().get(
  '/',
  requireAdminSession(),
  async (c) => {
    const held = await permissionsFor(c.var.admin.id);
    const includeAuditActivity = held.has('*') || held.has('audit_log:view');
    return adminJson(c, await dashboardSummary({ includeAuditActivity }));
  },
);
