import { z } from 'zod';

/**
 * Settings validation. Its own module so it stays reachable without a database —
 * see lib/queries/import-boundary.test.ts. Anything matching `*-schema.ts` or
 * `*-schemas.ts` under lib/services is held to that rule automatically.
 */

const urlOrEmpty = z.string().trim().url().or(z.literal(''));

/**
 * A Google Maps "Embed a map" src, or blank.
 *
 * The contact page drops this straight into an `<iframe src>`, so it must be an
 * official maps-embed URL and never arbitrary HTML. Validating it here is defence
 * in depth — the admin form also extracts the src from a pasted `<iframe>` — but
 * this is the check that actually runs on every save.
 */
const mapsEmbed = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => value === '' || value.startsWith('https://www.google.com/maps/embed'), {
    message: 'Must be a Google Maps “Embed a map” link, or blank.',
  });

export const generalSettingsSchema = z.object({
  siteName: z.string().trim().min(1).max(80),
  logoUrl: urlOrEmpty,
  ogImageUrl: urlOrEmpty,
  whatsappNumber: z.string().trim().max(32),
  contactEmail: z.string().trim().email().or(z.literal('')),
  address: z.string().trim().max(300),
  mapsEmbedUrl: mapsEmbed,
  instagramUrl: urlOrEmpty,
  tiktokUrl: urlOrEmpty,
  facebookUrl: urlOrEmpty,
  // Where the contact form delivers (step 13). Admin-only — it is a staff inbox,
  // and publishing it would hand spammers a target.
  inquiryEmail: z.string().trim().email().or(z.literal('')),
});

export type GeneralSettings = z.infer<typeof generalSettingsSchema>;

// PATCH accepts any subset; the server merges over what is stored.
export const updateSettingsSchema = generalSettingsSchema.partial();
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
