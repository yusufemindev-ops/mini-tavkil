import { Hono } from 'hono';
import {
  getGeneralSettings,
  updateGeneralSettings,
  updateSettingsSchema,
} from '@/lib/services/settings';
import { adminJson, parseJson, requireAdminPerm, type AppEnv } from '@/server/factory';

export const adminSettingsRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('settings:view'), async (c) => {
    return adminJson(c, await getGeneralSettings());
  })
  .patch('/', requireAdminPerm('settings:edit'), async (c) => {
    const body = await parseJson(c, updateSettingsSchema);
    return adminJson(c, await updateGeneralSettings(body, c.var.admin.id));
  });
