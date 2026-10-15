import { Hono } from 'hono';
import {
  getGeneralSettings,
  updateGeneralSettings,
  updateSettingsSchema,
} from '@/lib/services/settings';
import { adminJson, auditAdmin, parseJson, requireAdminPerm, type AppEnv } from '@/server/factory';

export const adminSettingsRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('settings:view'), async (c) => {
    return adminJson(c, await getGeneralSettings());
  })
  .patch('/', requireAdminPerm('settings:edit'), async (c) => {
    const body = await parseJson(c, updateSettingsSchema);
    const updated = await updateGeneralSettings(body, c.var.admin.id);
    const changedKeys = Object.keys(body).join(', ') || 'settings';
    await auditAdmin(c, {
      action: 'settings.updated',
      resourceType: 'settings',
      resourceId: 'general',
      target: 'Site settings',
      summary: `Updated settings (${changedKeys})`,
    });
    return adminJson(c, updated);
  });
