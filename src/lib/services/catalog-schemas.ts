import { z } from 'zod';

/**
 * Zod DTOs, ported from Tavkil's `dto/` essentially unchanged — they encode real
 * decisions, not boilerplate. Two of them are worth reading before touching:
 *
 * The slug regex allows uncased scripts (`\p{Lo}`) as well as lowercase Latin, so
 * an Arabic slug like `منشفة-حمام` validates. The storefront generates and indexes
 * non-Latin slugs for RTL SEO; a Latin-only regex would silently make Arabic URLs
 * impossible.
 *
 * The NFC transform is not cosmetic. Arabic letters can be encoded two
 * visually-identical ways; a browser normalises a URL path to NFC, so a slug stored
 * as NFD never matches on lookup and the page 404s. Normalising on save keeps both
 * sides equal.
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

// Draft-first: translations are optional so an incomplete row can be saved. The
// publish gate is what requires an English name and slug.
export const createCategorySchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().trim().min(1).nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
  translations: z.array(translationSchema).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/**
 * How a category's products are ordered on the storefront.
 *
 * Tavkil's list included `price_asc` / `price_desc`. Both are gone: there is no
 * public price here, so a storefront that honoured them would be sorting by a
 * number it must never reveal — and the ordering itself would leak the ranking.
 */
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

/**
 * Buyer-visible option axes (Colour, Size, …).
 *
 * `key` is a client-supplied id, stable only within one save payload, so variants
 * can reference the values that define them. Database ids can't be used: options
 * are deleted and recreated on every save, so their ids change each time.
 */
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

/**
 * A concrete variant. Price, SKU and MOQ live here, not on the product.
 *
 * A simple product sends one variant with `isDefault: true` and no
 * `optionValueKeys`. Prices are admin-only and never leave `/api/admin/*`.
 */
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
  // base_price_* are admin-only. They exist on this schema because the admin
  // writes them; they never appear in any public shape.
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

// Draft-first: nearly everything optional so an incomplete product saves. The
// publish gate enforces the real requirements.
export const createProductSchema = z.object(productFields);
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  ...productFields,
  status: z.enum(['draft', 'published', 'archived']).optional(),
  // Pin to the top of its category.
  isFeatured: z.boolean().optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/** Admin list query. Price sorts are fine here — the admin may see prices. */
export const adminListProductsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  sort: z.enum(['recent', 'oldest', 'sku', 'price_asc', 'price_desc']).default('recent'),
});
export type AdminListProductsQuery = z.infer<typeof adminListProductsSchema>;

/**
 * Reorder the PUBLISHED products of one category.
 *
 * Scoped to published on purpose: sort_order only affects what the storefront
 * shows, so letting a draft take a position would silently shift every published
 * product below it the moment that draft went live.
 */
export const reorderProductsSchema = z.object({
  categoryId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1),
});
export type ReorderProductsInput = z.infer<typeof reorderProductsSchema>;
