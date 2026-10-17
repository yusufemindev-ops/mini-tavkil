import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';

// R2 incremental cache enables ISR on Cloudflare Workers.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  // D1 tag cache allows revalidatePath() to purge cached routes immediately on mutations.
  tagCache: d1NextTagCache,
});
