import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';

// The R2 incremental cache is what makes ISR work on Workers. Without it every
// public page renders dynamically — slow TTFB, worse Core Web Vitals, and Google
// spends its crawl budget waiting on us. See PLAN.md §8 (Q10).
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
