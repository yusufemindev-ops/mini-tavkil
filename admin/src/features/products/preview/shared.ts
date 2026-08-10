// Pure helpers shared by the two storefront-style preview routes
// (/preview/category/:categoryId and /preview/product/:id). No JSX here so the
// logic stays trivially unit-testable.

import type { AdminProduct, AdminProductTranslation } from '../queries';

export type LocaleCode = 'en' | 'tr' | 'ar';
export type Theme = 'light' | 'dark';

export const LOCALES: readonly LocaleCode[] = ['en', 'tr', 'ar'];

// Common colour-name → hex so swatches show a sensible colour until a real
// per-value image is uploaded. Mirrors storefront/product-options.tsx.
const COLOR_MAP: Record<string, string> = {
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  graphite: '#374151',
  black: '#111827',
  white: '#e5e7eb',
  silver: '#cbd5e1',
  gold: '#d4af37',
  orange: '#f2640c',
  yellow: '#eab308',
};

export const colourFor = (label: string): string =>
  COLOR_MAP[label.trim().toLowerCase()] ?? '#9ca3af';

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

// Pick the translation for `locale`; fall back to English when it's missing or
// incomplete (mirrors the storefront — thin/machine content isn't shown).
export function pickTranslation(
  product: AdminProduct,
  locale: LocaleCode,
): AdminProductTranslation | null {
  const wanted = product.translations.find((t) => t.locale === locale);
  if (wanted && wanted.isComplete) return wanted;
  const english = product.translations.find((t) => t.locale === 'en');
  return english ?? wanted ?? null;
}

export function primaryImageUrl(product: AdminProduct): string | null {
  const primary = product.images.find((i) => i.isPrimary);
  return primary?.url ?? product.images[0]?.url ?? null;
}

// Resolve a product's display name for `locale`, falling back to English content
// then the SKU (mirrors the storefront).
export function resolveName(product: AdminProduct, locale: LocaleCode): string {
  return pickTranslation(product, locale)?.name ?? product.sku ?? 'Untitled product';
}

// ── URL-persisted preview state (?locale=&theme=) ─────────────────────────────

export function parseLocale(value: string | null): LocaleCode {
  return value === 'tr' || value === 'ar' ? value : 'en';
}

export function parseTheme(value: string | null): Theme {
  return value === 'dark' ? 'dark' : 'light';
}

// Build the `?locale&theme` suffix so grid → detail navigation keeps the chosen
// language + theme.
export function previewSearch(locale: LocaleCode, theme: Theme): string {
  const params = new URLSearchParams();
  params.set('locale', locale);
  params.set('theme', theme);
  return `?${params.toString()}`;
}
