import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';
import { SITE_INDEXABLE } from '@/lib/seo/metadata';

/**
 * Generates robots.txt rules.
 * Disallows indexing when SITE_INDEXABLE is false; preserves admin/api disallow rules when live.
 */

/** Explicitly allowed AI search crawlers. */
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

/** Optional user-agents to explicitly disallow. */
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
