import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';

// The R2 incremental cache is what makes ISR work on Workers. Without it every
// public page renders dynamically — slow TTFB, worse Core Web Vitals, and Google
// spends its crawl budget waiting on us. See PLAN.md §8 (Q10).
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  // `tagCache` defaults to "dummy", which makes `revalidatePath()` do NOTHING.
  // Admin edits then wait out the page's full `revalidate` window before the
  // storefront reflects them. With D1 wired up, `revalidateStorefront()` in
  // lib/cache.ts invalidates the affected paths the moment a mutation commits.
  tagCache: d1NextTagCache,
});
