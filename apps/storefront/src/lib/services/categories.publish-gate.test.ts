import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/api/errors';
import { assertCategoryPublishable, type AdminCategory } from './publish-gates';

// The publish gate is the one piece of real business logic in the category
// service, so it is tested directly rather than through a route. It is also the
// only place the failure can be caught: a published category with no English name
// or slug produces a storefront URL that cannot be built and a nav entry with no
// label, and nothing downstream can recover from either.

function category(translations: Partial<AdminCategory['translations'][number]>[]): AdminCategory {
  return {
    id: 'c1',
    parentId: null,
    imageUrl: null,
    displayOrder: 0,
    status: 'draft',
    sortStrategy: 'manual',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    translations: translations.map((t) => ({
      locale: 'en',
      name: 'Cleaning',
      slug: 'cleaning',
      description: null,
      seoTitle: null,
      seoDescription: null,
      isComplete: true,
      isMachineTranslated: false,
      ...t,
    })),
  };
}

describe('category publish gate', () => {
  it('passes with a complete English translation', () => {
    expect(() => assertCategoryPublishable(category([{}]))).not.toThrow();
  });

  it('blocks when there is no English translation at all', () => {
    const turkishOnly = category([{ locale: 'tr', name: 'Temizlik', slug: 'temizlik' }]);
    expect(() => assertCategoryPublishable(turkishOnly)).toThrow(AppError);
    expect(() => assertCategoryPublishable(turkishOnly)).toThrow(/'en' translation/);
  });

  it('blocks on a blank English name', () => {
    expect(() => assertCategoryPublishable(category([{ name: '   ' }]))).toThrow(/English name/);
  });

  it('blocks on a blank English slug', () => {
    expect(() => assertCategoryPublishable(category([{ slug: '  ' }]))).toThrow(/English slug/);
  });

  it('names every missing field at once rather than one per attempt', () => {
    // An admin fixing one field, saving, and being told about the next is a worse
    // experience than being told both up front.
    try {
      assertCategoryPublishable(category([{ name: '', slug: '' }]));
      throw new Error('should have thrown');
    } catch (error) {
      expect((error as AppError).message).toContain('English name');
      expect((error as AppError).message).toContain('English slug');
    }
  });

  it('throws a 422, not a 500', () => {
    try {
      assertCategoryPublishable(category([]));
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(422);
      expect((error as AppError).code).toBe('validation.failed');
    }
  });

  it('ignores other locales when judging publishability', () => {
    const withExtras = category([
      {},
      { locale: 'ar', name: '', slug: '' },
      { locale: 'tr', name: '', slug: '' },
    ]);
    // Only English gates publishing — a category must be publishable before its
    // translations exist, or nothing could ever go live.
    expect(() => assertCategoryPublishable(withExtras)).not.toThrow();
  });
});
