// Public, admin-managed site settings (branding + contact + social details).
//
// In Tavkil these came from the backend over HTTP; here the storefront and the
// admin are one deployable, so this reads the `system_settings` row directly.
// Never contains pricing or supplier data — public data only.

import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { systemSettings } from '@/lib/db/schema';

// General settings live as a single JSON blob under this key — same key the
// Tavkil admin writes, so the existing row is picked up unchanged.
export const GENERAL_SETTINGS_KEY = 'general';

export interface SiteSettings {
  siteName: string;
  logoUrl: string;
  ogImageUrl: string;
  whatsappNumber: string;
  contactEmail: string;
  address: string;
  mapsEmbedUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
}

// Defaults for a missing row, and to fill any field absent from an older stored
// blob so the shape is always complete. An empty string means "unset" everywhere,
// so callers uniformly hide the corresponding UI.
export const SETTINGS_DEFAULTS: SiteSettings = {
  siteName: 'Tavkil',
  logoUrl: '',
  ogImageUrl: '',
  whatsappNumber: '',
  contactEmail: '',
  address: '',
  mapsEmbedUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  facebookUrl: '',
};

// The storefront-safe allow-list. The stored blob may grow admin-only fields
// (e.g. the inquiry destination address); those must never reach a public page,
// so this picks fields explicitly rather than spreading the row.
function publicSubset(stored: Partial<SiteSettings>): SiteSettings {
  return {
    siteName: stored.siteName || SETTINGS_DEFAULTS.siteName,
    logoUrl: stored.logoUrl ?? '',
    ogImageUrl: stored.ogImageUrl ?? '',
    whatsappNumber: stored.whatsappNumber ?? '',
    contactEmail: stored.contactEmail ?? '',
    address: stored.address ?? '',
    mapsEmbedUrl: stored.mapsEmbedUrl ?? '',
    instagramUrl: stored.instagramUrl ?? '',
    tiktokUrl: stored.tiktokUrl ?? '',
    facebookUrl: stored.facebookUrl ?? '',
  };
}

// `cache()` dedupes within a single server request, so the layout, header, and
// footer all share one query.
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const [row] = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, GENERAL_SETTINGS_KEY))
      .limit(1);
    return publicSubset((row?.value ?? {}) as Partial<SiteSettings>);
  } catch {
    // A page must never crash over settings.
    return { ...SETTINGS_DEFAULTS };
  }
});

// Build a wa.me link from a raw phone number. Non-digits (spaces, +, dashes) are
// stripped. Returns '' when there's nothing to link, so callers hide the control.
export function waUrl(number: string, text?: string): string {
  let digits = (number ?? '').replace(/\D/g, '');
  // `00` is the international access prefix people dial, not part of the number.
  // wa.me wants country code + subscriber number and nothing else: a saved
  // "00905333922089" builds a wa.me link that simply does not resolve, and the
  // button looks like it works right up until someone presses it.
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!digits) return '';
  const url = `https://wa.me/${digits}`;
  return text ? `${url}?text=${encodeURIComponent(text)}` : url;
}
