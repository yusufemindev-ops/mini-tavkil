import { revalidatePath } from 'next/cache';
import { routing } from '@/i18n/routing';

/**
 * Push an admin change onto the storefront immediately.
 *
 * Public pages are `revalidate = 3600`, which is right for a catalogue that
 * changes when someone publishes rather than continuously — but on its own it
 * means an admin waits up to an hour to see their own edit. This is the other
 * half: the background window keeps the cache warm, and these calls invalidate
 * the moment a mutation commits.
 *
 * `revalidatePath` only works because `open-next.config.ts` configures a D1 tag
 * cache. OpenNext defaults `tagCache` to `"dummy"`, under which these calls
 * succeed and do nothing at all — the worst kind of broken, since the code reads
 * as correct.
 *
 * Every path is invalidated in all three locales. Missing one leaves Turkish
 * showing yesterday's catalogue while English is current, which is the sort of
 * bug nobody notices until a customer does.
 */
/**
 * `revalidatePath` throws outside a request context. Services are called from
 * route handlers today, but a future script or cron reusing one must not die on
 * a cache hint — the write is the thing that matters, and the page refreshes on
 * its own within the revalidate window regardless.
 */
function safeRevalidate(path: string, type?: 'page' | 'layout'): void {
  try {
    if (type) revalidatePath(path, type);
    else revalidatePath(path);
  } catch {
    // Not in a request context; the background window still covers it.
  }
}

function forEachLocale(path: string): void {
  for (const locale of routing.locales) {
    safeRevalidate(`/${locale}${path}`);
  }
}

/**
 * A product changed — created, edited, published, unpublished, archived,
 * restored, reordered, or had its images touched.
 *
 * The product page itself is only part of it: the homepage carries featured
 * products and the TV showcase, the catalogue lists categories, and the category
 * page lists this product. `slugs` covers the localized product URLs, which
 * differ per locale.
 */
export function revalidateProduct(slugs: Record<string, string> = {}): void {
  forEachLocale('');
  forEachLocale('/catalogue');
  for (const [locale, slug] of Object.entries(slugs)) {
    if (slug) safeRevalidate(`/${locale}/product/${slug}`);
  }
  // The category listing a product belongs to is a dynamic route; invalidating
  // the segment covers every category page without needing to know which.
  safeRevalidate('/[locale]/catalogue/[category]', 'page');
  revalidateSeoSurfaces();
}

/** A category changed — created, edited, published, unpublished or reordered. */
export function revalidateCategory(slugs: Record<string, string> = {}): void {
  forEachLocale('');
  forEachLocale('/catalogue');
  for (const [locale, slug] of Object.entries(slugs)) {
    if (slug) safeRevalidate(`/${locale}/catalogue/${slug}`);
  }
  safeRevalidate('/[locale]/catalogue/[category]', 'page');
  revalidateSeoSurfaces();
}

/**
 * Settings changed — site name, logo, contact details, social links.
 *
 * These render in the header and footer of every public page, so this is the one
 * case where invalidating the whole storefront is proportionate.
 */
export function revalidateSettings(): void {
  forEachLocale('');
  forEachLocale('/catalogue');
  forEachLocale('/about');
  forEachLocale('/contact');
  safeRevalidate('/[locale]/catalogue/[category]', 'page');
  safeRevalidate('/[locale]/product/[slug]', 'page');
  revalidateSeoSurfaces();
}

/**
 * The machine-readable surfaces. They are derived from the same rows, so a stale
 * sitemap after a publish is a real SEO cost: `lastModified` would advertise a
 * date Google has already crawled.
 */
function revalidateSeoSurfaces(): void {
  safeRevalidate('/sitemap.xml');
  safeRevalidate('/llms.txt');
  safeRevalidate('/llms-full.txt');
}
