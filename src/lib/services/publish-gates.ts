import { invalid } from '@/lib/api/errors';

/**
 * Business logic validations required before categories or products can be published.
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

/** Asserts that a category has required English name and slug before publish. */
export function assertCategoryPublishable(category: AdminCategory): void {
  const missing = missingEnglishFields(category.translations);
  if (missing.length > 0) {
    throw invalid(`Cannot publish: missing ${missing.join(', ')}.`);
  }
}

/** Returns list of missing required English translation fields. */
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

/** Requirements a product must meet before publishing (SKU, price, image, translations, category, supplier). */
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
