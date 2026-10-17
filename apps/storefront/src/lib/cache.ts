import { routing } from '@/i18n/routing';

/**
 * Invalidation helpers to purge ISR cached storefront pages immediately on admin mutations.
 * Decoupled from `next/cache` so the Hono API server bundles cleanly without pulling in Next.js internals.
 */
type RevalidateFn = (path: string, type?: 'page' | 'layout') => void;

let revalidateImpl: RevalidateFn | null = null;

/** Registers the framework ISR revalidator (e.g. `revalidatePath` from `next/cache`). */
export function registerRevalidator(fn: RevalidateFn): void {
  revalidateImpl = fn;
}

/** Executes the registered local framework revalidator when running inside the Storefront Worker. */
export function revalidateLocal(path: string, type?: 'page' | 'layout'): void {
  if (!revalidateImpl) return;
  try {
    if (type) revalidateImpl(path, type);
    else revalidateImpl(path);
  } catch {
    // Not in a request context; the background window still covers it.
  }
}

function safeRevalidate(path: string, type?: 'page' | 'layout'): void {
  if (revalidateImpl) {
    revalidateLocal(path, type);
    return;
  }
  const storefrontUrl = process.env.STOREFRONT_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!storefrontUrl || !secret) return;
  void fetch(`${storefrontUrl.replace(/\/$/, '')}/api/internal/revalidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-revalidate-secret': secret,
    },
    body: JSON.stringify({ path, type }),
  }).catch(() => {});
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
