import { Hono } from 'hono';
import { listAuditLogs } from '@/lib/services/audit-log';
import { listAuditLogsSchema } from '@/lib/services/audit-log-schema';
import { adminJson, parseQuery, requireAdminPerm, type AppEnv } from '@/server/factory';

export const adminAuditLogsRoutes = new Hono<AppEnv>().get(
  '/',
  requireAdminPerm('audit_log:view'),
  async (c) => {
    const query = parseQuery(c, listAuditLogsSchema);
    return adminJson(c, await listAuditLogs(query));
  },
);
