import type { MetadataRoute } from 'next';
import { getSiteSettings } from '@/lib/settings';

/**
 * The web app manifest.
 *
 * Not because this needs to be an installable app — it is a catalogue — but
 * because the manifest is what tells a phone the browser chrome should be brand
 * orange rather than white, and what a bookmarked shortcut is called. Both are
 * visible to anyone who saves the site, and both were missing.
 *
 * `siteName` comes from settings so renaming the site in the admin renames the
 * shortcut too, rather than leaving "Tavkil" hardcoded in a second place.
 */
export const revalidate = 3600;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();

  return {
    name: `${settings.siteName} — wholesale from verified Turkish manufacturers`,
    short_name: settings.siteName,
    description:
      'Browse verified manufacturing categories with full specifications, MOQs and country of origin in the open.',
    start_url: '/en',
    display: 'standalone',
    // The storefront's own surface colours, so the splash and browser chrome do
    // not flash white before the page paints.
    background_color: '#0f1115',
    theme_color: '#f2640c',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
