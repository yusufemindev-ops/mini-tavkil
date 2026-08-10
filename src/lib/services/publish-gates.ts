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
