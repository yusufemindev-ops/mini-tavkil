import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import { SITE_INDEXABLE } from '@/lib/seo/metadata';
import { publicSitemapEntries } from '@/lib/queries/public-product';

/**
 * Generates sitemap.xml.
 * `lastModified` uses row updatedAt timestamp (never current date).
 */
export const revalidate = 3600;

const STATIC_PATHS = ['', '/catalogue', '/about', '/contact'] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Non-indexable deployments emit an empty sitemap.
  if (!SITE_INDEXABLE) return [];

  const base = env.baseUrl.replace(/\/+$/, '');
  const url = (locale: string, path: string) => `${base}/${locale}${path}`;

  const entries: MetadataRoute.Sitemap = [];

  // Static routes exist in every locale, so each one advertises all three.
  const staticLanguages = Object.fromEntries(
    routing.locales.map((locale) => [locale, url(locale, '')]),
  );

  for (const path of STATIC_PATHS) {
    for (const locale of routing.locales) {
      entries.push({
        url: url(locale, path),
        changeFrequency: path === '' ? 'weekly' : 'monthly',
        priority: path === '' ? 1 : 0.7,
        alternates: {
          languages: Object.fromEntries(
            Object.keys(staticLanguages).map((code) => [code, url(code, path)]),
          ),
        },
      });
    }
  }

  const rows = await publicSitemapEntries();

  // Group by entity id to assemble hreflang alternates across localized slugs.
  const byEntity = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = `${row.type}:${row.id}`;
    byEntity.set(key, [...(byEntity.get(key) ?? []), row]);
  }

  for (const group of byEntity.values()) {
    const prefix = group[0].type === 'product' ? '/product' : '/catalogue';
    const languages = Object.fromEntries(
      group.map((row) => [row.locale, url(row.locale, `${prefix}/${row.slug}`)]),
    );

    for (const row of group) {
      entries.push({
        url: url(row.locale, `${prefix}/${row.slug}`),
        lastModified: row.updatedAt,
        changeFrequency: 'weekly',
        priority: row.type === 'product' ? 0.8 : 0.6,
        alternates: { languages },
      });
    }
  }

  return entries;
}
