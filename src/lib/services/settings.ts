import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { systemSettings } from '@/lib/db/schema';
import { GENERAL_SETTINGS_KEY, SETTINGS_DEFAULTS, type SiteSettings } from '@/lib/settings';
import {
  generalSettingsSchema,
  updateSettingsSchema,
  type GeneralSettings,
  type UpdateSettingsInput,
} from '@/lib/services/settings-schema';
import { revalidateSettings } from '@/lib/cache';

export { generalSettingsSchema, updateSettingsSchema };
export type { GeneralSettings, UpdateSettingsInput };

/** Admin settings service managing general system_settings row and cache revalidation. */

export const ADMIN_SETTINGS_DEFAULTS: GeneralSettings = {
  ...(SETTINGS_DEFAULTS as SiteSettings),
  inquiryEmail: '',
};

/** The stored blob merged over the defaults, so the shape is always complete. */
export async function getGeneralSettings(): Promise<GeneralSettings> {
  const [row] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, GENERAL_SETTINGS_KEY))
    .limit(1);
  return { ...ADMIN_SETTINGS_DEFAULTS, ...((row?.value ?? {}) as Partial<GeneralSettings>) };
}

export async function updateGeneralSettings(
  input: UpdateSettingsInput,
  actorId: string,
): Promise<GeneralSettings> {
  const merged: GeneralSettings = { ...(await getGeneralSettings()), ...input };
  const now = new Date().toISOString();

  await db
    .insert(systemSettings)
    .values({
      key: GENERAL_SETTINGS_KEY,
      value: merged,
      description: 'Admin-managed general settings (branding, SEO defaults, contact, social).',
      updatedByUserId: actorId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: merged, updatedByUserId: actorId, updatedAt: now },
    });

  const updated = merged;
  // Invalidate storefront cache across pages that display site settings.
  revalidateSettings();
  return updated;
}
