import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import { SITE_INDEXABLE } from '@/lib/seo/metadata';
import { publicSitemapEntries } from '@/lib/queries/public-product';

/**
 * The sitemap.
 *
 * **`lastModified` is the row's own `updated_at`, never `new Date()`.** A sitemap
 * that claims everything changed today teaches Google the signal is worthless, and
 * it responds by crawling the site *less*. This is the single most consequential
 * line in this file, which is why the query returns `updatedAt` at all and why
 * `public-product.test.ts` asserts no bare `new Date()` exists in that module.
 *
 * One query per hour rather than one per crawl: at ~600 URLs an uncached sitemap
 * is a meaningful load for a bot that fetches it repeatedly.
 */
export const revalidate = 3600;

const STATIC_PATHS = ['', '/catalogue', '/about', '/contact'] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A deployment that isn't indexable advertises nothing. robots.ts already
  // disallows everything, but a sitemap left reachable is an invitation to index
  // the workers.dev URL anyway.
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

  // Group by entity id, because a catalogue slug differs per locale — grouping on
  // the slug would treat each translation as a separate page and emit no
  // alternates at all. Only locales with a complete translation are present (the
  // query filters on isComplete), so a locale we don't serve is never advertised
  // as an alternate, which is what makes the hreflang set reciprocal.
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
