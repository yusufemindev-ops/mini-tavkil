import { revalidatePath } from 'next/cache';
import { routing } from '@/i18n/routing';

/**
 * Invalidation helpers to purge ISR cached storefront pages immediately on admin mutations.
 */
// Safely invoke revalidatePath, ignoring errors outside request context (e.g. scripts).
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

/** Revalidates product, category, home, and SEO pages affected by a product mutation. */
export function revalidateProduct(slugs: Record<string, string> = {}): void {
  forEachLocale('');
  forEachLocale('/catalogue');
  for (const [locale, slug] of Object.entries(slugs)) {
    if (slug) safeRevalidate(`/${locale}/product/${slug}`);
  }
  // Invalidate dynamic category route segment across all locales.
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

/** Revalidates all storefront pages when global site settings change. */
export function revalidateSettings(): void {
  forEachLocale('');
  forEachLocale('/catalogue');
  forEachLocale('/about');
  forEachLocale('/contact');
  safeRevalidate('/[locale]/catalogue/[category]', 'page');
  safeRevalidate('/[locale]/product/[slug]', 'page');
  revalidateSeoSurfaces();
}

/** Revalidates sitemap and LLM feed surfaces. */
function revalidateSeoSurfaces(): void {
  safeRevalidate('/sitemap.xml');
  safeRevalidate('/llms.txt');
  safeRevalidate('/llms-full.txt');
}
