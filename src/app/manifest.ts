import type { MetadataRoute } from 'next';
import { getSiteSettings } from '@/lib/settings';

/**
 * Web app manifest providing brand colors, icons, and metadata for bookmarks/PWA.
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
    background_color: '#0f1115',
    theme_color: '#f2640c',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
