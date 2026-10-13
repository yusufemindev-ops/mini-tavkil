import { z } from 'zod';

/**
 * Zod schemas for catalog entities.
 * Supports Unicode lowercase slugs and NFC normalization across locales.
 */

export const LOCALES = ['en', 'tr', 'ar'] as const;

const slug = z
  .string()
  .trim()
  .min(1)
  .regex(
    /^[\p{Ll}\p{Lo}\p{Nd}]+(?:-[\p{Ll}\p{Lo}\p{Nd}]+)*$/u,
    'Slug must be lowercase and hyphen-separated.',
  )
  .transform((value) => value.normalize('NFC'));

export const translationSchema = z.object({
  locale: z.enum(LOCALES),
  name: z.string().trim().min(1),
  slug,
  description: z.string().trim().min(1).nullable().optional(),
  seoTitle: z.string().trim().min(1).nullable().optional(),
  seoDescription: z.string().trim().min(1).nullable().optional(),
  isComplete: z.boolean().optional(),
  isMachineTranslated: z.boolean().optional(),
});

export type TranslationInput = z.infer<typeof translationSchema>;

// Optional translations permit saving drafts before publish gate validation.
export const createCategorySchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().trim().min(1).nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
  translations: z.array(translationSchema).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/** Category product ordering strategies (excluding price to prevent ranking leaks). */
export const SORT_STRATEGIES = ['manual', 'newest', 'moq'] as const;

export const updateCategorySchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().trim().min(1).nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
  // Categories are navigation buckets — draft or published, never archived.
  status: z.enum(['draft', 'published']).optional(),
  sortStrategy: z.enum(SORT_STRATEGIES).optional(),
  translations: z.array(translationSchema).optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// One ordered list of sibling ids → display_order = index. One atomic request
// instead of N per-row PATCHes from the drag-and-drop UI.
export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export type ReorderInput = z.infer<typeof reorderSchema>;

// ── Products ─────────────────────────────────────────────────────────────────

// Product translations add a markdown spec sheet on top of the shared shape.
export const productTranslationSchema = translationSchema.extend({
  specsMd: z.string().trim().min(1).nullable().optional(),
});

export type ProductTranslationInput = z.infer<typeof productTranslationSchema>;

export const productAttributeSchema = z.object({
  locale: z.enum(LOCALES),
  name: z.string().trim().min(1),
  value: z.string().trim().min(1),
  sortOrder: z.number().int().min(0).optional(),
});

export const productImageSchema = z.object({
  url: z.string().trim().min(1),
  // Per-locale alt text. Step 14e requires real alt text, not filenames.
  alt: z.partialRecord(z.enum(LOCALES), z.string().trim()).optional(),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/** Option values; client `key` links options to variants within a save payload. */
export const productOptionValueSchema = z.object({
  key: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1),
  imageUrl: z.string().trim().min(1).nullable().optional(),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{3,8}$/, 'Colour must be a hex value.')
    .nullable()
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const productOptionSchema = z.object({
  key: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1),
  type: z.enum(['swatch', 'chip']).default('chip'),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  values: z.array(productOptionValueSchema).optional(),
});

export type ProductOptionInput = z.infer<typeof productOptionSchema>;

/** Concrete product variant schema with SKU, pricing, and MOQ. */
export const productVariantSchema = z.object({
  sku: z.string().trim().min(1).nullable().optional(),
  basePriceAmount: z.number().min(0).nullable().optional(),
  basePriceCurrency: z.string().trim().length(3).nullable().optional(),
  moq: z.number().int().min(1).optional(),
  packSize: z.number().int().min(1).nullable().optional(),
  weightKg: z.number().min(0).nullable().optional(),
  imageUrl: z.string().trim().min(1).nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  optionValueKeys: z.array(z.string().trim().min(1)).optional(),
});

export type ProductVariantInput = z.infer<typeof productVariantSchema>;

const productFields = {
  supplierId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  sku: z.string().trim().min(1).nullable().optional(),
  moq: z.number().int().min(1).optional(),
  boxQuantity: z.number().int().min(1).nullable().optional(),
  packSize: z.number().int().min(1).nullable().optional(),
  unit: z.string().trim().min(1).optional(),
  hsCode: z.string().trim().min(1).nullable().optional(),
  brandName: z.string().trim().min(1).nullable().optional(),
  countryOfOrigin: z.string().trim().length(2).nullable().optional(),
  gtin13: z.string().trim().min(1).nullable().optional(),
  mpn: z.string().trim().min(1).nullable().optional(),
  // base_price_* fields are admin-only and never exposed publicly.
  basePriceAmount: z.number().min(0).nullable().optional(),
  basePriceCurrency: z.string().trim().length(3).nullable().optional(),
  weightKg: z.number().min(0).nullable().optional(),
  cbm: z.number().min(0).nullable().optional(),
  translations: z.array(productTranslationSchema).optional(),
  attributes: z.array(productAttributeSchema).optional(),
  images: z.array(productImageSchema).optional(),
  options: z.array(productOptionSchema).optional(),
  variants: z.array(productVariantSchema).optional(),
};

export const createProductSchema = z.object(productFields);
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  ...productFields,
  status: z.enum(['draft', 'published', 'archived']).optional(),
  isFeatured: z.boolean().optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/** Admin list query. */
export const adminListProductsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  search: z.string().trim().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  sort: z.enum(['recent', 'oldest', 'sku', 'price_asc', 'price_desc']).default('recent'),
});
export type AdminListProductsQuery = z.infer<typeof adminListProductsSchema>;

/** Reorders published products within a category. */
export const reorderProductsSchema = z.object({
  categoryId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1),
});
export type ReorderProductsInput = z.infer<typeof reorderProductsSchema>;
