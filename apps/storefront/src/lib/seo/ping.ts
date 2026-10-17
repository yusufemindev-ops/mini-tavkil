import { submitToIndexNow, urlsFor, type IndexNowTarget } from '@/lib/seo/indexnow';

/**
 * Fire-and-forget IndexNow ping for a publish-state change.
 *
 * Deliberately not awaited by callers and deliberately never throwing: a publish
 * must not fail, or even slow down, because a search engine was unreachable. The
 * admin has no useful action to take on "IndexNow returned 500", so the only
 * place it appears is the Worker log.
 */
export function pingIndexNow(target: IndexNowTarget): void {
  void submitToIndexNow(urlsFor(target)).catch(() => {
    /* already logged in submitToIndexNow */
  });
}
