import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';

export const SITE_NAME = 'Tavkil';
export const BASE_URL = env.baseUrl;

/**
 * Whether this deployment may be indexed at all. Stays false until the custom
 * domain is attached and the SEO work is done (PLAN.md §15) — otherwise the
 * workers.dev URL gets indexed and then competes with the real domain.
 */
export const SITE_INDEXABLE = process.env.SITE_INDEXABLE === 'true';

function localizedUrl(locale: string, path: string): string {
  return `${BASE_URL}/${locale}${path}`;
}

interface PageMetaInput {
  locale: string;
  /** Path after the locale segment, e.g. '' for home, '/about'. */
  path?: string;
  title: string;
  description: string;
  ogType?: 'website' | 'article';
  /** Relative to BASE_URL (resolved via metadataBase). */
  ogImage?: string;
  index?: boolean;
  /**
   * Locales to advertise as hreflang alternates. Defaults to all configured
   * locales, which is correct for static pages — they exist everywhere. For a
   * catalogue entity pass only the locales with a genuine complete translation,
   * so a locale we don't actually serve is never advertised as an alternate.
   */
  alternateLocales?: string[];
  /**
   * Per-locale path after the locale segment, e.g.
   * `{ en: '/catalogue/cleaning', tr: '/catalogue/temizlik' }`. Catalogue slugs
   * differ per locale, so each hreflang and the canonical must point at that
   * locale's OWN URL. Falls back to `path` for any locale not in the map.
   */
  localizedPaths?: Record<string, string>;
}

/**
 * The single source of public-page metadata: canonical, hreflang for every locale
 * that has real content, `x-default`, Open Graph, and Twitter.
 *
 * Two rules worth stating outright. The canonical always points at the page's own
 * locale — never cross-locale, which would tell Google the other two translations
 * are duplicates and drop them. And when `SITE_INDEXABLE` is false everything is
 * `noindex`, regardless of the per-page `index` flag: a staging URL that gets
 * indexed is very hard to un-index.
 */
export function buildMetadata({
  locale,
  path = '',
  title,
  description,
  ogType = 'website',
  ogImage,
  index = true,
  alternateLocales,
  localizedPaths,
}: PageMetaInput): Metadata {
  const pathFor = (code: string): string => localizedPaths?.[code] ?? path;
  const canonicalPath = pathFor(locale);

  const allowed = (alternateLocales ?? routing.locales).filter((code) =>
    (routing.locales as readonly string[]).includes(code),
  );

  const languages: Record<string, string> = {};
  for (const code of allowed) languages[code] = localizedUrl(code, pathFor(code));
  languages['x-default'] = localizedUrl(routing.defaultLocale, pathFor(routing.defaultLocale));

  const images = ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined;
  const indexable = SITE_INDEXABLE && index;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    alternates: { canonical: localizedUrl(locale, canonicalPath), languages },
    openGraph: {
      type: ogType,
      siteName: SITE_NAME,
      title,
      description,
      url: localizedUrl(locale, canonicalPath),
      locale,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    // A page kept out of the index stays crawlable (`follow`) so crawlers still
    // reach its real-translation alternates.
    robots: indexable ? undefined : { index: false, follow: true },
  };
}
