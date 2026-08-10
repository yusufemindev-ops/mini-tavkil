import { invalid } from '@/lib/api/errors';

/**
 * Publish gates and the admin shapes they judge.
 *
 * These are pure business logic and live apart from the services that call them,
 * for two reasons. They are the part of Tavkil worth carrying over verbatim, so
 * they deserve their own tests — and a test of a publish rule should not need a
 * database, which it would if these sat next to the queries (`lib/db` throws at
 * module scope, so importing the service is enough to fail).
 *
 * Every gate exists because the failure it prevents cannot be recovered from
 * downstream. A published row with no English name yields a URL that can't be
 * built and a nav entry with no label; there is no later point that can fix it.
 */

export const DEFAULT_LOCALE = 'en';

export interface AdminTranslation {
  locale: string;
  name: string;
  slug: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isComplete: boolean;
  isMachineTranslated: boolean;
}

export interface AdminCategory {
  id: string;
  parentId: string | null;
  imageUrl: string | null;
  displayOrder: number;
  status: string;
  sortStrategy: string;
  createdAt: string;
  updatedAt: string;
  translations: AdminTranslation[];
}

/** A published category needs an English name and slug. Nothing else. */
export function assertCategoryPublishable(category: AdminCategory): void {
  const missing = missingEnglishFields(category.translations);
  if (missing.length > 0) {
    throw invalid(`Cannot publish: missing ${missing.join(', ')}.`);
  }
}

/**
 * Shared by both gates. Names *every* missing field rather than the first — an
 * admin who fixes one, saves, and is then told about the next has been made to do
 * the work twice.
 */
export function missingEnglishFields(translations: readonly AdminTranslation[]): string[] {
  const missing: string[] = [];
  const english = translations.find((t) => t.locale === DEFAULT_LOCALE);
  if (!english) {
    missing.push(`a '${DEFAULT_LOCALE}' translation`);
    return missing;
  }
  if (!english.name.trim()) missing.push('English name');
  if (!english.slug.trim()) missing.push('English slug');
  return missing;
}

/**
 * What a product needs before it can go live.
 *
 * Ported from Tavkil unchanged in intent, and every clause earns its place —
 * publishing is the last point at which any of these can be caught:
 *
 *   SKU            — the buyer quotes it back to us in an enquiry
 *   base price     — admin-only, but a product we cannot price cannot be sold
 *   an image       — a card with only the brand gradient reads as broken
 *   English name+slug — no English translation means no URL and no label
 *   published category — the product's only route in is its category page; under
 *                        a draft category it would be an orphan, reachable only
 *                        by direct link and never crawled
 *   published supplier — we would be listing goods from a supplier we have not
 *                        finished vetting
 *
 * The last two are the ones worth keeping despite being inconvenient: both
 * produce a live page that looks fine and is quietly wrong.
 */
export interface PublishableProduct {
  sku: string | null;
  basePriceAmount: string | null;
  basePriceCurrency: string | null;
  imageCount: number;
  translations: readonly AdminTranslation[];
  categoryStatus: string | null;
  supplierStatus: string | null;
}

export function assertProductPublishable(product: PublishableProduct): void {
  const missing: string[] = [];
  if (!product.sku?.trim()) missing.push('an SKU');
  if (product.basePriceAmount == null || product.basePriceCurrency == null) {
    missing.push('a base price');
  }
  if (product.imageCount === 0) missing.push('at least one image');

  const english = product.translations.find((t) => t.locale === DEFAULT_LOCALE);
  if (!english || !english.name.trim() || !english.slug.trim()) {
    missing.push(`a complete '${DEFAULT_LOCALE}' translation (name + slug)`);
  }
  if (product.categoryStatus !== 'published') missing.push('a published category');
  if (product.supplierStatus !== 'published') missing.push('a published supplier');

  if (missing.length > 0) {
    throw invalid(`Cannot publish: missing ${missing.join(', ')}.`);
  }
}
