import { Hono } from 'hono';
import { listAuditLogs } from '@/lib/services/audit-log';
import { listAuditLogsSchema } from '@/lib/services/audit-log-schema';
import { adminJson, requireAdminPerm, type AppEnv } from '@/server/factory';

export const adminAuditLogsRoutes = new Hono<AppEnv>().get(
  '/',
  requireAdminPerm('audit_log:view'),
  async (c) => {
    const url = new URL(c.req.url);
    const query = listAuditLogsSchema.parse(Object.fromEntries(url.searchParams.entries()));
    return adminJson(c, await listAuditLogs(query));
  },
);
