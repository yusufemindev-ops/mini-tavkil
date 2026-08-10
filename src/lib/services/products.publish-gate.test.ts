import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/api/errors';
import { assertProductPublishable, type PublishableProduct } from './publish-gates';

// Six clauses, each preventing a distinct failure that nothing downstream can fix.
// Tested one at a time so a regression names which rule broke.

function product(overrides: Partial<PublishableProduct> = {}): PublishableProduct {
  return {
    sku: 'SEED-P-01',
    basePriceAmount: '12.5000',
    basePriceCurrency: 'USD',
    imageCount: 1,
    translations: [
      {
        locale: 'en',
        name: 'Multi-Surface Cleaner 5L',
        slug: 'multi-surface-cleaner-5l',
        description: null,
        seoTitle: null,
        seoDescription: null,
        isComplete: true,
        isMachineTranslated: false,
      },
    ],
    categoryStatus: 'published',
    supplierStatus: 'published',
    ...overrides,
  };
}

describe('product publish gate', () => {
  it('passes a complete product', () => {
    expect(() => assertProductPublishable(product())).not.toThrow();
  });

  it.each([
    ['no SKU', { sku: null }, /an SKU/],
    ['a blank SKU', { sku: '   ' }, /an SKU/],
    ['no price amount', { basePriceAmount: null }, /a base price/],
    ['no price currency', { basePriceCurrency: null }, /a base price/],
    ['no images', { imageCount: 0 }, /at least one image/],
    ['no translations', { translations: [] }, /'en' translation/],
    ['a draft category', { categoryStatus: 'draft' }, /published category/],
    ['no category at all', { categoryStatus: null }, /published category/],
    ['a draft supplier', { supplierStatus: 'draft' }, /published supplier/],
    ['no supplier at all', { supplierStatus: null }, /published supplier/],
  ])('blocks %s', (_label, overrides, pattern) => {
    expect(() => assertProductPublishable(product(overrides))).toThrow(pattern);
  });

  it('blocks a product whose only translation is not English', () => {
    const arabicOnly = product({
      translations: [
        {
          locale: 'ar',
          name: 'منظف',
          slug: 'منظف',
          description: null,
          seoTitle: null,
          seoDescription: null,
          isComplete: true,
          isMachineTranslated: false,
        },
      ],
    });
    // Without an English translation there is no canonical URL and no admin label.
    expect(() => assertProductPublishable(arabicOnly)).toThrow(/'en' translation/);
  });

  it('blocks an English translation with a blank name or slug', () => {
    const blank = product({
      translations: [
        {
          locale: 'en',
          name: '  ',
          slug: 'x',
          description: null,
          seoTitle: null,
          seoDescription: null,
          isComplete: true,
          isMachineTranslated: false,
        },
      ],
    });
    expect(() => assertProductPublishable(blank)).toThrow(/'en' translation/);
  });

  it('reports every missing requirement in one message', () => {
    // An admin fixing one field per save round-trip is the failure mode this
    // avoids — publishing a new product can easily miss three of these.
    try {
      assertProductPublishable(
        product({
          sku: null,
          basePriceAmount: null,
          imageCount: 0,
          categoryStatus: 'draft',
          supplierStatus: 'draft',
        }),
      );
      throw new Error('should have thrown');
    } catch (error) {
      const message = (error as AppError).message;
      for (const fragment of [
        'an SKU',
        'a base price',
        'at least one image',
        'a published category',
        'a published supplier',
      ]) {
        expect(message).toContain(fragment);
      }
    }
  });

  it('is a 422, so the admin UI shows it as a form error not a crash', () => {
    try {
      assertProductPublishable(product({ sku: null }));
    } catch (error) {
      expect((error as AppError).status).toBe(422);
      expect((error as AppError).code).toBe('validation.failed');
    }
  });

  it('accepts a zero price — free samples are a real case', () => {
    // The gate requires a price to *exist*, not to be non-zero. "0.0000" is a
    // decision someone made; null is a field nobody filled in.
    expect(() => assertProductPublishable(product({ basePriceAmount: '0.0000' }))).not.toThrow();
  });
});
