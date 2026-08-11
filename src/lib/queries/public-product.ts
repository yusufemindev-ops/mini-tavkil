/**
 * The ONLY product and category shapes public pages may render.
 *
 * There is no `price` field and no `supplier` field — not optional, absent. That
 * is the entire enforcement mechanism: a leak becomes a compile error rather than
 * something a reviewer has to catch.
 *
 * Rules (see CLAUDE.md §1):
 *   - Public pages call the functions in this file. Nothing else.
 *   - Never widen these types "just for one page".
 *   - Never select `basePriceAmount`, `basePriceCurrency`, `supplierId`, or any
 *     `suppliers` column here — not even into a variable that gets discarded.
 *   - Strip at the query, not at the render — a Server Component passing an object
 *     to a Client Component serialises it into the HTML, visible in view-source
 *     even if it is never displayed.
 *
 * Admin queries live in src/lib/queries/admin-*.ts and are called only from
 * /api/admin/*. Those may include price and supplier.
 */

import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  categories,
  categoryTranslations,
  productAttributes,
  productImages,
  productOptions,
  productOptionValues,
  products,
  productTranslations,
} from '@/lib/db/schema';
import { routing } from '@/i18n/routing';
import { DEFAULT_PRODUCT_SORT, type ProductSort } from '@/lib/catalog/product-sort';
import { resolveImageUrl } from '@/lib/media/image-url';

export type Locale = (typeof routing.locales)[number];

export type PublicImage = {
  url: string;
  /** From `alt_translations` for the requested locale. Never a filename. */
  alt: string;
  isPrimary: boolean;
};

export type PublicAttribute = { label: string; value: string };

export type PublicOption = {
  name: string;
  type: string;
  values: { label: string; imageUrl: string | null; colorHex: string | null }[];
};

/** Per-locale, locale-prefix-less slugs, for the language switcher and hreflang. */
export type LocalizedSlugs = Partial<Record<Locale, string>>;

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Markdown spec sheet, rendered on the product page's Specs tab. */
  specsMd: string | null;
  sku: string | null;
  brandName: string | null;
  countryOfOrigin: string | null;
  /** Minimum order quantity, and the unit it is counted in. */
  moq: number;
  unit: string;
  boxQuantity: number | null;
  packSize: number | null;
  /** Gross carton weight, kg. Numeric columns arrive as strings from pg. */
  weightKg: string | null;
  /** Carton volume, m³. */
  cbm: string | null;
  /** EAN-13 barcode — a public product identifier, and Google's `gtin13`. */
  gtin13: string | null;
  isFeatured: boolean;
  images: PublicImage[];
  category: { slug: string; name: string } | null;
  attributes: PublicAttribute[];
  options: PublicOption[];
  localizedSlugs: LocalizedSlugs;
  /** Sitemap `lastModified` comes from this — never `new Date()`. */
  updatedAt: Date;
};

export type PublicCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  parent: { slug: string; name: string } | null;
  localizedSlugs: LocalizedSlugs;
  updatedAt: Date;
};

export type PublicFilter = {
  /** Category slug **in the requested locale** — it comes from the URL. */
  category?: string;
  /** Include products in child categories of `category`. */
  includeDescendants?: boolean;
  featured?: boolean;
  sort?: ProductSort;
  limit?: number;
  offset?: number;
};

export type SitemapEntry = {
  type: 'product' | 'category';
  /** Entity id, so the sitemap can group a row's locales into hreflang alternates. */
  id: string;
  slug: string;
  locale: Locale;
  updatedAt: Date;
};

// ─── Shared predicates ───────────────────────────────────────────────────────
//
// A row is public only if it is published and not soft-deleted, AND the requested
// locale has a *complete* translation. There is deliberately no English fallback:
// a page served in Arabic with English content is a thin/duplicate page, and
// linking to it from the sitemap costs crawl budget for nothing.

const productIsPublic = and(eq(products.status, 'published'), isNull(products.deletedAt));
const categoryIsPublic = and(eq(categories.status, 'published'), isNull(categories.deletedAt));

function translationIsComplete(locale: Locale) {
  return and(eq(productTranslations.locale, locale), eq(productTranslations.isComplete, true));
}

function categoryTranslationIsComplete(locale: Locale) {
  return and(eq(categoryTranslations.locale, locale), eq(categoryTranslations.isComplete, true));
}

// The exact column list every product read uses. Written out rather than
// `getTableColumns(products)` on purpose: spreading the table would pull in
// `basePriceAmount`, `basePriceCurrency`, and `supplierId`.
const productColumns = {
  id: products.id,
  moq: products.moq,
  unit: products.unit,
  boxQuantity: products.boxQuantity,
  packSize: products.packSize,
  /**
   * Carton logistics, published deliberately.
   *
   * A wholesale buyer costs a shipment from these three: how many fit a carton,
   * what it weighs and what volume it occupies. They were imported from the
   * supplier's price list and then never selected here, so the specification
   * table showed "Units per box" and nothing else.
   *
   * None of them is a price or a supplier, which is the only thing this shape
   * refuses to carry (CLAUDE.md §1). A barcode is a public product identifier —
   * it is what a buyer scans — and Google reads it as `gtin13`.
   */
  weightKg: products.weightKg,
  cbm: products.cbm,
  gtin13: products.gtin13,
  sku: products.sku,
  brandName: products.brandName,
  countryOfOrigin: products.countryOfOrigin,
  isFeatured: products.isFeatured,
  sortOrder: products.sortOrder,
  updatedAt: products.updatedAt,
  categoryId: products.categoryId,
  name: productTranslations.name,
  description: productTranslations.description,
  specsMd: productTranslations.specsMd,
  slug: productTranslations.slug,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function altFor(altTranslations: unknown, locale: Locale): string {
  if (!altTranslations || typeof altTranslations !== 'object') return '';
  const value = (altTranslations as Record<string, unknown>)[locale];
  return typeof value === 'string' ? value : '';
}

async function localizedProductSlugs(productIds: string[]): Promise<Map<string, LocalizedSlugs>> {
  const out = new Map<string, LocalizedSlugs>();
  if (productIds.length === 0) return out;
  const rows = await db
    .select({
      productId: productTranslations.productId,
      locale: productTranslations.locale,
      slug: productTranslations.slug,
    })
    .from(productTranslations)
    .where(
      and(
        inArray(productTranslations.productId, productIds),
        eq(productTranslations.isComplete, true),
      ),
    );
  for (const row of rows) {
    if (!isLocale(row.locale)) continue;
    const entry = out.get(row.productId) ?? {};
    entry[row.locale] = row.slug;
    out.set(row.productId, entry);
  }
  return out;
}

function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

async function imagesFor(
  productIds: string[],
  locale: Locale,
): Promise<Map<string, PublicImage[]>> {
  const out = new Map<string, PublicImage[]>();
  if (productIds.length === 0) return out;
  const rows = await db
    .select({
      productId: productImages.productId,
      url: productImages.url,
      altTranslations: productImages.altTranslations,
      isPrimary: productImages.isPrimary,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder));
  for (const row of rows) {
    const list = out.get(row.productId) ?? [];
    list.push({
      // Stored as a bare R2 key so step 15's host swap needs no migration.
      url: resolveImageUrl(row.url),
      alt: altFor(row.altTranslations, locale),
      isPrimary: row.isPrimary,
    });
    out.set(row.productId, list);
  }
  return out;
}

async function categoryLabels(
  categoryIds: string[],
  locale: Locale,
): Promise<Map<string, { slug: string; name: string }>> {
  const out = new Map<string, { slug: string; name: string }>();
  const ids = categoryIds.filter(Boolean);
  if (ids.length === 0) return out;
  const rows = await db
    .select({
      id: categories.id,
      slug: categoryTranslations.slug,
      name: categoryTranslations.name,
    })
    .from(categories)
    .innerJoin(categoryTranslations, eq(categoryTranslations.categoryId, categories.id))
    .where(
      and(inArray(categories.id, ids), categoryIsPublic, categoryTranslationIsComplete(locale)),
    );
  for (const row of rows) out.set(row.id, { slug: row.slug, name: row.name });
  return out;
}

// ─── Products ────────────────────────────────────────────────────────────────

/**
 * One published product by its slug **in the given locale**. Returns null when the
 * product does not exist, is not published, is soft-deleted, or has no complete
 * translation for that locale — all of which the page turns into a 404.
 */
export async function publicProduct(slug: string, locale: Locale): Promise<PublicProduct | null> {
  const [row] = await productBaseQuery()
    .where(and(productIsPublic, translationIsComplete(locale), eq(productTranslations.slug, slug)))
    .limit(1);

  if (!row) return null;

  const [images, attributes, options, slugs, categoryById] = await Promise.all([
    imagesFor([row.id], locale),
    db
      .select({ label: productAttributes.attrName, value: productAttributes.attrValue })
      .from(productAttributes)
      .where(and(eq(productAttributes.productId, row.id), eq(productAttributes.locale, locale)))
      .orderBy(asc(productAttributes.sortOrder)),
    optionsFor(row.id),
    localizedProductSlugs([row.id]),
    categoryLabels(row.categoryId ? [row.categoryId] : [], locale),
  ]);

  return toPublicProduct(row, {
    images: images.get(row.id) ?? [],
    attributes,
    options,
    localizedSlugs: slugs.get(row.id) ?? {},
    category: row.categoryId ? (categoryById.get(row.categoryId) ?? null) : null,
  });
}

/**
 * Attributes and options for MANY products in two queries.
 *
 * `llms-full.txt` used to re-read every product with `publicProduct()` to get
 * these — roughly five queries per row. At twelve products that is ~60 outbound
 * fetches from a single Worker invocation, past Cloudflare's subrequest limit,
 * and the route returned a 500 with `fetch failed`. It also broke the build,
 * where the same route is prerendered.
 *
 * Two set-based reads instead, regardless of catalogue size.
 */
export async function publicDetailsFor(
  productIds: string[],
  locale: Locale,
): Promise<{
  attributes: Map<string, PublicAttribute[]>;
  options: Map<string, PublicOption[]>;
}> {
  const attributes = new Map<string, PublicAttribute[]>();
  const options = new Map<string, PublicOption[]>();
  if (productIds.length === 0) return { attributes, options };

  const [attributeRows, optionRows] = await Promise.all([
    db
      .select({
        productId: productAttributes.productId,
        label: productAttributes.attrName,
        value: productAttributes.attrValue,
      })
      .from(productAttributes)
      .where(
        and(inArray(productAttributes.productId, productIds), eq(productAttributes.locale, locale)),
      )
      .orderBy(asc(productAttributes.sortOrder)),
    db
      .select({
        productId: productOptions.productId,
        optionId: productOptions.id,
        name: productOptions.name,
        type: productOptions.type,
        label: productOptionValues.label,
        imageUrl: productOptionValues.imageUrl,
        colorHex: productOptionValues.colorHex,
      })
      .from(productOptions)
      .leftJoin(productOptionValues, eq(productOptionValues.optionId, productOptions.id))
      .where(and(inArray(productOptions.productId, productIds), eq(productOptions.isVisible, true)))
      .orderBy(asc(productOptions.sortOrder), asc(productOptionValues.sortOrder)),
  ]);

  for (const row of attributeRows) {
    const list = attributes.get(row.productId) ?? [];
    list.push({ label: row.label, value: row.value });
    attributes.set(row.productId, list);
  }

  const optionByKey = new Map<string, PublicOption>();
  for (const row of optionRows) {
    const key = row.optionId;
    let option = optionByKey.get(key);
    if (!option) {
      option = { name: row.name, type: row.type, values: [] };
      optionByKey.set(key, option);
      const list = options.get(row.productId) ?? [];
      list.push(option);
      options.set(row.productId, list);
    }
    if (row.label !== null) {
      option.values.push({
        label: row.label,
        // A swatch image is an R2 key too — same resolution as category images.
        imageUrl: row.imageUrl ? resolveImageUrl(row.imageUrl) : null,
        colorHex: row.colorHex,
      });
    }
  }

  return { attributes, options };
}

async function optionsFor(productId: string): Promise<PublicOption[]> {
  const rows = await db
    .select({
      optionId: productOptions.id,
      name: productOptions.name,
      type: productOptions.type,
      optionSort: productOptions.sortOrder,
      label: productOptionValues.label,
      imageUrl: productOptionValues.imageUrl,
      colorHex: productOptionValues.colorHex,
      valueSort: productOptionValues.sortOrder,
    })
    .from(productOptions)
    .leftJoin(productOptionValues, eq(productOptionValues.optionId, productOptions.id))
    .where(and(eq(productOptions.productId, productId), eq(productOptions.isVisible, true)))
    .orderBy(asc(productOptions.sortOrder), asc(productOptionValues.sortOrder));

  const byOption = new Map<string, PublicOption>();
  for (const row of rows) {
    const option = byOption.get(row.optionId) ?? { name: row.name, type: row.type, values: [] };
    if (row.label !== null) {
      option.values.push({
        label: row.label,
        // A swatch image is an R2 key too — same resolution as category images.
        imageUrl: row.imageUrl ? resolveImageUrl(row.imageUrl) : null,
        colorHex: row.colorHex,
      });
    }
    byOption.set(row.optionId, option);
  }
  return [...byOption.values()];
}

// The one query both product reads start from, so the column list — and therefore
// what can possibly reach a public page — is defined in exactly one place.
function productBaseQuery() {
  return db
    .select(productColumns)
    .from(products)
    .innerJoin(productTranslations, eq(productTranslations.productId, products.id))
    .$dynamic();
}

type ProductRow = Awaited<ReturnType<typeof productBaseQuery>>[number];

function toPublicProduct(
  row: ProductRow,
  extra: {
    images: PublicImage[];
    attributes: PublicAttribute[];
    options: PublicOption[];
    localizedSlugs: LocalizedSlugs;
    category: { slug: string; name: string } | null;
  },
): PublicProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    specsMd: row.specsMd,
    sku: row.sku,
    brandName: row.brandName,
    countryOfOrigin: row.countryOfOrigin,
    moq: row.moq,
    unit: row.unit,
    boxQuantity: row.boxQuantity,
    packSize: row.packSize,
    weightKg: row.weightKg,
    cbm: row.cbm,
    gtin13: row.gtin13,
    isFeatured: row.isFeatured,
    images: extra.images,
    category: extra.category,
    attributes: extra.attributes,
    options: extra.options,
    localizedSlugs: extra.localizedSlugs,
    updatedAt: new Date(row.updatedAt),
  };
}

// Resolving the category by its slug in this locale is what makes
// `/tr/catalogue/temizlik` filter the same category `/en/catalogue/cleaning` does.
// With `includeDescendants`, a top-level category page also lists everything in
// its children — otherwise a parent with all its products filed under
// subcategories would render an empty grid.
function categoryConditions(filter: PublicFilter, locale: Locale) {
  if (!filter.category) return [];

  const matched = db
    .select({ id: categoryTranslations.categoryId })
    .from(categoryTranslations)
    .where(
      and(eq(categoryTranslations.locale, locale), eq(categoryTranslations.slug, filter.category)),
    );

  if (!filter.includeDescendants) return [inArray(products.categoryId, matched)];

  const withChildren = db
    .select({ id: categories.id })
    .from(categories)
    .where(or(inArray(categories.id, matched), inArray(categories.parentId, matched)));

  return [inArray(products.categoryId, withChildren)];
}

function orderFor(sort: ProductSort) {
  switch (sort) {
    case 'moq':
      return [asc(products.moq), asc(productTranslations.name)];
    case 'az':
      return [asc(productTranslations.name)];
    default:
      // Featured first so a home rail reads correctly, then the admin's manual
      // order, then a stable tiebreak so pagination can't repeat or skip a row.
      return [
        desc(products.isFeatured),
        asc(products.sortOrder),
        asc(productTranslations.name),
        asc(products.id),
      ];
  }
}

/**
 * Published products for a listing surface: the home rails, a category grid, or
 * search. Options are omitted — they only matter on the product page, and
 * fetching them per card would be a query per row.
 */
export async function publicProducts(
  filter: PublicFilter,
  locale: Locale,
): Promise<PublicProduct[]> {
  const conditions = [
    productIsPublic,
    translationIsComplete(locale),
    ...categoryConditions(filter, locale),
  ];

  if (filter.featured) conditions.push(eq(products.isFeatured, true));

  let query = productBaseQuery()
    .where(and(...conditions))
    .orderBy(...orderFor(filter.sort ?? DEFAULT_PRODUCT_SORT));

  if (filter.limit !== undefined) query = query.limit(filter.limit);
  if (filter.offset !== undefined) query = query.offset(filter.offset);

  const rows = await query;
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const categoryIds = [...new Set(rows.map((row) => row.categoryId).filter((id) => id !== null))];

  const [images, slugs, categoryById] = await Promise.all([
    imagesFor(ids, locale),
    localizedProductSlugs(ids),
    categoryLabels(categoryIds, locale),
  ]);

  return rows.map((row) =>
    toPublicProduct(row, {
      images: images.get(row.id) ?? [],
      attributes: [],
      options: [],
      localizedSlugs: slugs.get(row.id) ?? {},
      category: row.categoryId ? (categoryById.get(row.categoryId) ?? null) : null,
    }),
  );
}

// ─── Categories ──────────────────────────────────────────────────────────────

/**
 * Category images are stored as bare R2 keys, exactly like product images, and
 * so have to be resolved the same way.
 *
 * Product images went through `resolveImageUrl` from the start; categories did
 * not, and nothing revealed it because no category had ever had an image — every
 * card fell through to the gradient placeholder. The moment the Temsan import
 * gave all sixteen of them a photograph, every card and every rail pill rendered
 * a broken image instead.
 */
function categoryImage(reference: string | null): string | null {
  return reference ? resolveImageUrl(reference) : null;
}

export async function publicCategory(slug: string, locale: Locale): Promise<PublicCategory | null> {
  const [row] = await db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      imageUrl: categories.imageUrl,
      updatedAt: categories.updatedAt,
      slug: categoryTranslations.slug,
      name: categoryTranslations.name,
      description: categoryTranslations.description,
    })
    .from(categories)
    .innerJoin(categoryTranslations, eq(categoryTranslations.categoryId, categories.id))
    .where(
      and(
        categoryIsPublic,
        categoryTranslationIsComplete(locale),
        eq(categoryTranslations.slug, slug),
      ),
    )
    .limit(1);

  if (!row) return null;

  const [slugs, parentById] = await Promise.all([
    localizedCategorySlugs([row.id]),
    categoryLabels(row.parentId ? [row.parentId] : [], locale),
  ]);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: categoryImage(row.imageUrl),
    parent: row.parentId ? (parentById.get(row.parentId) ?? null) : null,
    localizedSlugs: slugs.get(row.id) ?? {},
    updatedAt: new Date(row.updatedAt),
  };
}

/** Every published category with a complete translation, in display order. */
export async function publicCategories(locale: Locale): Promise<PublicCategory[]> {
  const rows = await db
    .select({
      id: categories.id,
      parentId: categories.parentId,
      imageUrl: categories.imageUrl,
      updatedAt: categories.updatedAt,
      slug: categoryTranslations.slug,
      name: categoryTranslations.name,
      description: categoryTranslations.description,
    })
    .from(categories)
    .innerJoin(categoryTranslations, eq(categoryTranslations.categoryId, categories.id))
    .where(and(categoryIsPublic, categoryTranslationIsComplete(locale)))
    .orderBy(asc(categories.displayOrder), asc(categoryTranslations.name));

  if (rows.length === 0) return [];

  const parentIds = [...new Set(rows.map((row) => row.parentId).filter((id) => id !== null))];
  const [slugs, parentById] = await Promise.all([
    localizedCategorySlugs(rows.map((row) => row.id)),
    categoryLabels(parentIds, locale),
  ]);

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: categoryImage(row.imageUrl),
    parent: row.parentId ? (parentById.get(row.parentId) ?? null) : null,
    localizedSlugs: slugs.get(row.id) ?? {},
    updatedAt: new Date(row.updatedAt),
  }));
}

async function localizedCategorySlugs(categoryIds: string[]): Promise<Map<string, LocalizedSlugs>> {
  const out = new Map<string, LocalizedSlugs>();
  if (categoryIds.length === 0) return out;
  const rows = await db
    .select({
      categoryId: categoryTranslations.categoryId,
      locale: categoryTranslations.locale,
      slug: categoryTranslations.slug,
    })
    .from(categoryTranslations)
    .where(
      and(
        inArray(categoryTranslations.categoryId, categoryIds),
        eq(categoryTranslations.isComplete, true),
      ),
    );
  for (const row of rows) {
    if (!isLocale(row.locale)) continue;
    const entry = out.get(row.categoryId) ?? {};
    entry[row.locale] = row.slug;
    out.set(row.categoryId, entry);
  }
  return out;
}

// ─── Sitemap ─────────────────────────────────────────────────────────────────

/**
 * Every indexable product and category URL, with the row's own `updatedAt`.
 *
 * `lastModified` must be the real modification time: a sitemap that claims
 * everything changed today teaches Google the signal is worthless and it crawls
 * the site *less*. See PLAN.md §11.
 */
export async function publicSitemapEntries(): Promise<SitemapEntry[]> {
  const [productRows, categoryRows] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: productTranslations.slug,
        locale: productTranslations.locale,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .innerJoin(productTranslations, eq(productTranslations.productId, products.id))
      .where(and(productIsPublic, eq(productTranslations.isComplete, true))),
    db
      .select({
        id: categories.id,
        slug: categoryTranslations.slug,
        locale: categoryTranslations.locale,
        updatedAt: categories.updatedAt,
      })
      .from(categories)
      .innerJoin(categoryTranslations, eq(categoryTranslations.categoryId, categories.id))
      .where(and(categoryIsPublic, eq(categoryTranslations.isComplete, true))),
  ]);

  const entries: SitemapEntry[] = [];
  for (const row of productRows) {
    if (isLocale(row.locale)) {
      entries.push({
        type: 'product',
        id: row.id,
        slug: row.slug,
        locale: row.locale,
        updatedAt: new Date(row.updatedAt),
      });
    }
  }
  for (const row of categoryRows) {
    if (isLocale(row.locale)) {
      entries.push({
        type: 'category',
        id: row.id,
        slug: row.slug,
        locale: row.locale,
        updatedAt: new Date(row.updatedAt),
      });
    }
  }
  return entries;
}

/** Total published products in a locale — for a category grid's result count. */
export async function publicProductCount(filter: PublicFilter, locale: Locale): Promise<number> {
  // Shares categoryConditions with publicProducts on purpose: a count that
  // disagreed with the grid it labels is worse than no count.
  const conditions = [
    productIsPublic,
    translationIsComplete(locale),
    ...categoryConditions(filter, locale),
  ];
  if (filter.featured) conditions.push(eq(products.isFeatured, true));

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(productTranslations, eq(productTranslations.productId, products.id))
    .where(and(...conditions));
  return row?.count ?? 0;
}
