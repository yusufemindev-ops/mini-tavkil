import { adminRoute } from '@/lib/api/handler';
import {
  getGeneralSettings,
  updateGeneralSettings,
  updateSettingsSchema,
  type UpdateSettingsInput,
} from '@/lib/services/settings';

export const dynamic = 'force-dynamic';

export const GET = adminRoute('settings:view', async () => getGeneralSettings());

export const PATCH = adminRoute<Record<string, never>, UpdateSettingsInput>(
  'settings:edit',
  updateSettingsSchema,
  async ({ body, admin }) => updateGeneralSettings(body, admin.id),
);
