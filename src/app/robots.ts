import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { SITE_INDEXABLE } from '@/lib/seo/metadata';

/**
 * robots.txt.
 *
 * While `SITE_INDEXABLE` is false this disallows everything, and that is the
 * point: the workers.dev URL must never get indexed, because un-indexing a host
 * later is slow and unreliable, and it would compete with tavkil.com for the same
 * content. Step 15 flips the flag once the custom domain is attached.
 *
 * `/admin` and `/api` stay disallowed either way. Not as a security measure —
 * both are authenticated and robots.txt binds nobody — but so crawl budget is
 * spent on the catalogue rather than on 401s.
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.baseUrl.replace(/\/+$/, '');

  if (!SITE_INDEXABLE) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/sign-in'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
