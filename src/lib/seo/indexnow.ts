import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import { SITE_INDEXABLE } from '@/lib/seo/metadata';

/**
 * IndexNow — tell Bing and Yandex a URL changed, immediately.
 *
 * Worth being precise about what this does and doesn't buy, because it is easy to
 * over-invest in: **Google uses neither IndexNow nor sitemap pings** (it retired
 * the latter in 2023). For Google what actually works is an accurate
 * `lastModified`, Search Console, and internal linking. This is for Bing, Yandex,
 * Seznam and Naver — real traffic, but not the main event.
 *
 * Fire-and-forget by construction: every failure path returns quietly. A publish
 * must never fail because a search engine was unreachable, and an admin has no
 * useful response to "IndexNow returned 500".
 */

const ENDPOINT = 'https://api.indexnow.org/IndexNow';

export type IndexNowTarget = {
  type: 'product' | 'category';
  slugs: Partial<Record<string, string>>;
};

/** Every locale URL for an entity, plus the listing pages a change affects. */
export function urlsFor(target: IndexNowTarget): string[] {
  const base = env.baseUrl.replace(/\/+$/, '');
  const prefix = target.type === 'product' ? '/product' : '/catalogue';

  const urls = Object.entries(target.slugs)
    .filter(([locale, slug]) => Boolean(slug) && routing.locales.includes(locale as never))
    .map(([locale, slug]) => `${base}/${locale}${prefix}/${slug}`);

  // Publishing changes the listing pages too — the catalogue index and the
  // locale home both render product rails. Submitting only the product URL
  // leaves those showing a stale cached copy in the index.
  for (const locale of routing.locales) {
    urls.push(`${base}/${locale}/catalogue`);
  }

  return [...new Set(urls)];
}

/**
 * Submit a URL set. Returns the HTTP status, or null when it did not run.
 *
 * Callers should pass this to `ctx.waitUntil()` rather than awaiting it, so the
 * admin's response isn't held up by a third-party round trip.
 */
export async function submitToIndexNow(urls: string[]): Promise<number | null> {
  const key = process.env.INDEXNOW_API_KEY;

  // Nothing to do if the site isn't indexable yet — submitting a noindex URL is
  // at best ignored and at worst teaches the engine to distrust the feed.
  if (!SITE_INDEXABLE || !key || urls.length === 0) return null;

  let host: string;
  try {
    host = new URL(env.baseUrl).host;
  } catch {
    return null;
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${env.baseUrl.replace(/\/+$/, '')}/${key}.txt`,
        urlList: urls,
      }),
      // A search engine being slow must not hold an admin request open.
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.warn(`IndexNow returned ${response.status} for ${urls.length} URLs`);
    }
    return response.status;
  } catch (error) {
    console.warn('IndexNow submission failed:', (error as Error)?.message);
    return null;
  }
}
