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
