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
 *
 * The AI crawlers are named explicitly even though `*` already allows them. Two
 * reasons: it records the decision, and it survives a future tightening of the
 * wildcard — the failure mode there is silent, because nothing tells you an
 * answer engine stopped reading the catalogue.
 *
 * The ones named below are the crawlers that *cite and link*: an answer that
 * mentions Tavkil sends a buyer here. Training-only crawlers (CCBot,
 * anthropic-ai, Google-Extended, and their peers) read the catalogue without
 * ever returning a visitor, and they are currently allowed by the wildcard. That
 * is a business decision, not a technical one — to reverse it, add them to
 * TRAINING_ONLY below.
 */

/** Crawlers that cite sources in answers, so a read can become a buyer. */
const AI_SEARCH_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Bingbot',
  'Applebot-Extended',
];

/** Add a user-agent here to refuse it. Empty on purpose — see the note above. */
const TRAINING_ONLY: string[] = [];
export default function robots(): MetadataRoute.Robots {
  const base = env.baseUrl.replace(/\/+$/, '');

  if (!SITE_INDEXABLE) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
      ...AI_SEARCH_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: ['/admin', '/api'],
      })),
      ...(TRAINING_ONLY.length > 0 ? [{ userAgent: TRAINING_ONLY, disallow: '/' }] : []),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
