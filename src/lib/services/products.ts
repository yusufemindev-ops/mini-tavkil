import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
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
  productVariantOptionValues,
  productVariants,
  suppliers,
  supplierTranslations,
} from '@/lib/db/schema';
import { conflict, invalid, isUniqueViolation, notFound } from '@/lib/api/errors';
import { resolveImageUrl } from '@/lib/media/image-url';
import {
  assertProductPublishable,
  DEFAULT_LOCALE,
  type AdminTranslation,
} from '@/lib/services/publish-gates';
import type {
  AdminListProductsQuery,
  CreateProductInput,
  ProductOptionInput,
  ProductTranslationInput,
  ProductVariantInput,
  UpdateProductInput,
} from '@/lib/services/catalog-schemas';

/**
 * Product service — the big one.
 *
 * Business logic carried over intact: the publish gate, publish-appends-to-the-end
 * ordering, reorder-is-published-only, and the options/variants rebuild. Every
 * query rewritten from Prisma to Drizzle.
 *
 * Dropped along with their features: audience-shaped public reads (there are no
 * buyers), tier price computation, audit-log writes, and the archive check for
 * live orders (there are no orders).
 *
 * Everything here may read and write price and supplier. That is the whole reason
 * it lives in `lib/services` and is reachable only from `/api/admin/*` — the public
 * shape in `lib/queries/public-product.ts` has no field to put them in.
 */

const PUBLISHED = 'published';
const DRAFT = 'draft';
const ARCHIVED = 'archived';

export interface AdminProduct {
  id: string;
  sku: string | null;
  status: string;
  isFeatured: boolean;
  sortOrder: number;
  moq: number;
  unit: string;
  boxQuantity: number | null;
  packSize: number | null;
  hsCode: string | null;
  brandName: string | null;
  countryOfOrigin: string | null;
  gtin13: string | null;
  mpn: string | null;
  weightKg: string | null;
  cbm: string | null;
  basePriceAmount: string | null;
  basePriceCurrency: string | null;
  categoryId: string | null;
  supplierId: string | null;
  createdAt: string;
  updatedAt: string;
  translations: AdminTranslation[];
  images: { url: string; alt: Record<string, string>; isPrimary: boolean; sortOrder: number }[];
  attributes: { locale: string; name: string; value: string; sortOrder: number }[];
  options: {
    id: string;
    name: string;
    type: string;
    isVisible: boolean;
    sortOrder: number;
    values: { id: string; label: string; imageUrl: string | null; colorHex: string | null }[];
  }[];
  variants: {
    id: string;
    sku: string | null;
    basePriceAmount: string | null;
    basePriceCurrency: string | null;
    moq: number;
    packSize: number | null;
    isDefault: boolean;
    isActive: boolean;
    sortOrder: number;
    optionValueIds: string[];
  }[];
}

export interface ProductPage {
  items: AdminProduct[];
  page: number;
  pageSize: number;
  total: number;
}

// ── Reads ────────────────────────────────────────────────────────────────────

function adminFilters(query: AdminListProductsQuery, ignoreStatus = false) {
  const conditions = [isNull(products.deletedAt)];
  if (!ignoreStatus && query.status) conditions.push(eq(products.status, query.status));
  if (query.categoryId) conditions.push(eq(products.categoryId, query.categoryId));
  if (query.supplierId) conditions.push(eq(products.supplierId, query.supplierId));
  if (query.search) {
    const term = `%${query.search}%`;
    // Matches SKU, brand, or any translation's name. The translation match is a
    // subquery rather than a join so a product with three translations still
    // appears once.
    const byName = inArray(
      products.id,
      db
        .select({ id: productTranslations.productId })
        .from(productTranslations)
        .where(ilike(productTranslations.name, term)),
    );
    conditions.push(or(ilike(products.sku, term), ilike(products.brandName, term), byName)!);
  }
  return conditions;
}

function adminOrder(sort: AdminListProductsQuery['sort']) {
  switch (sort) {
    case 'oldest':
      return [asc(products.createdAt)];
    case 'sku':
      return [asc(products.sku)];
    // Price sorts are legitimate here: this endpoint is admin-only and the caller
    // has already passed products:view.
    case 'price_asc':
      return [asc(products.basePriceAmount)];
    case 'price_desc':
      return [desc(products.basePriceAmount)];
    default:
      return [desc(products.createdAt)];
  }
}

export async function listProducts(query: AdminListProductsQuery): Promise<ProductPage> {
  const where = and(...adminFilters(query));

  const [rows, [total]] = await Promise.all([
    db
      .select({ id: products.id })
      .from(products)
      .where(where)
      .orderBy(...adminOrder(query.sort))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ n: count() }).from(products).where(where),
  ]);

  const items = await hydrate(rows.map((row) => row.id));
  return { items, page: query.page, pageSize: query.pageSize, total: Number(total?.n ?? 0) };
}

/** Counts per status, for the admin's filter tabs. Ignores the status filter. */
export async function productStatusCounts(
  query: AdminListProductsQuery,
): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: products.status, n: count() })
    .from(products)
    .where(and(...adminFilters(query, true)))
    .groupBy(products.status);

  const counts: Record<string, number> = { draft: 0, published: 0, archived: 0, total: 0 };
  for (const row of rows) {
    counts[row.status] = Number(row.n);
    counts.total += Number(row.n);
  }
  return counts;
}

export async function getProduct(id: string): Promise<AdminProduct> {
  await findActive(id);
  const [product] = await hydrate([id]);
  if (!product) throw notFound('Product not found.');
  return product;
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createProduct(
  input: CreateProductInput,
  actorId: string,
): Promise<AdminProduct> {
  const priceSet = input.basePriceAmount != null && input.basePriceCurrency != null;
  const now = new Date().toISOString();

  const [row] = await db
    .insert(products)
    .values({
      supplierId: input.supplierId ?? null,
      categoryId: input.categoryId ?? null,
      sku: input.sku ?? null,
      moq: input.moq ?? 1,
      boxQuantity: input.boxQuantity ?? null,
      packSize: input.packSize ?? null,
      unit: input.unit ?? 'piece',
      hsCode: input.hsCode ?? null,
      brandName: input.brandName ?? null,
      countryOfOrigin: input.countryOfOrigin ?? null,
      gtin13: input.gtin13 ?? null,
      mpn: input.mpn ?? null,
      basePriceAmount: input.basePriceAmount?.toString() ?? null,
      basePriceCurrency: input.basePriceCurrency ?? null,
      // Who set the price and when is admin provenance, kept because a price
      // changing with no record of who changed it is exactly the thing you want
      // to look up six months later.
      ...(priceSet ? { basePriceUpdatedAt: now, basePriceUpdatedBy: actorId } : {}),
      weightKg: input.weightKg?.toString() ?? null,
      cbm: input.cbm?.toString() ?? null,
    })
    .returning();

  await applyChildren(row.id, input, actorId);
  return getProduct(row.id);
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  actorId: string,
): Promise<AdminProduct> {
  await findActive(id);

  const patch: Record<string, unknown> = {};
  const assign = <K extends keyof UpdateProductInput>(
    key: K,
    column: string,
    map = (v: unknown) => v,
  ) => {
    if (input[key] !== undefined) patch[column] = map(input[key]);
  };

  assign('supplierId', 'supplierId');
  assign('categoryId', 'categoryId');
  assign('sku', 'sku');
  assign('moq', 'moq');
  assign('boxQuantity', 'boxQuantity');
  assign('packSize', 'packSize');
  assign('unit', 'unit');
  assign('hsCode', 'hsCode');
  assign('brandName', 'brandName');
  assign('countryOfOrigin', 'countryOfOrigin');
  assign('gtin13', 'gtin13');
  assign('mpn', 'mpn');
  assign('status', 'status');
  assign('isFeatured', 'isFeatured');
  assign('basePriceAmount', 'basePriceAmount', (v) => (v == null ? null : String(v)));
  assign('basePriceCurrency', 'basePriceCurrency');
  assign('weightKg', 'weightKg', (v) => (v == null ? null : String(v)));
  assign('cbm', 'cbm', (v) => (v == null ? null : String(v)));

  const now = new Date().toISOString();
  if (input.basePriceAmount != null && input.basePriceCurrency != null) {
    patch.basePriceUpdatedAt = now;
    patch.basePriceUpdatedBy = actorId;
  }

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = now;
    await db.update(products).set(patch).where(eq(products.id, id));
  }

  await applyChildren(id, input, actorId);
  return getProduct(id);
}

export async function deleteProduct(id: string): Promise<{ id: string }> {
  await findActive(id);
  const now = new Date().toISOString();
  await db.update(products).set({ deletedAt: now, updatedAt: now }).where(eq(products.id, id));
  return { id };
}

/**
 * Publish, appending to the end of its category's published list.
 *
 * The append matters: `sort_order` defaults to 0, so a newly published product
 * would otherwise jump to the top of the category and displace whatever the admin
 * had deliberately merchandised there.
 */
export async function publishProduct(id: string): Promise<AdminProduct> {
  const row = await findActive(id);
  assertProductPublishable(await publishableView(id, row));

  const [max] = await db
    .select({ value: sql<number>`coalesce(max(${products.sortOrder}), 0)::int` })
    .from(products)
    .where(
      and(
        row.categoryId ? eq(products.categoryId, row.categoryId) : isNull(products.categoryId),
        eq(products.status, PUBLISHED),
        isNull(products.deletedAt),
      ),
    );

  await db
    .update(products)
    .set({
      status: PUBLISHED,
      sortOrder: (max?.value ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, id));
  return getProduct(id);
}

export async function unpublishProduct(id: string): Promise<AdminProduct> {
  await findActive(id);
  await db
    .update(products)
    .set({ status: DRAFT, updatedAt: new Date().toISOString() })
    .where(eq(products.id, id));
  return getProduct(id);
}

/** Archive = discontinued for good. Kept for records; off the storefront. */
export async function archiveProduct(id: string): Promise<AdminProduct> {
  await findActive(id);
  await db
    .update(products)
    .set({ status: ARCHIVED, updatedAt: new Date().toISOString() })
    .where(eq(products.id, id));
  return getProduct(id);
}

/** Restore an archived product to draft — never straight back to published. */
export async function restoreProduct(id: string): Promise<AdminProduct> {
  const row = await findActive(id);
  if (row.status !== ARCHIVED) throw invalid('Only an archived product can be restored.');
  await db
    .update(products)
    .set({ status: DRAFT, updatedAt: new Date().toISOString() })
    .where(eq(products.id, id));
  return getProduct(id);
}

/**
 * Reorder a category's published products.
 *
 * Rejects any id that is not a published product in this category. Order only
 * applies to the storefront-visible set, so a draft taking a position would
 * silently shift every product below it the moment it went live.
 */
export async function reorderProducts(categoryId: string, ids: string[]): Promise<{ ok: true }> {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        inArray(products.id, ids),
        eq(products.categoryId, categoryId),
        eq(products.status, PUBLISHED),
        isNull(products.deletedAt),
      ),
    );

  const found = new Set(rows.map((row) => row.id));
  if (ids.some((id) => !found.has(id))) {
    throw invalid('Every id must be a published product in this category.');
  }

  const now = new Date().toISOString();
  const updates = ids.map((id, index) =>
    db
      .update(products)
      .set({ sortOrder: index + 1, updatedAt: now })
      .where(eq(products.id, id)),
  );
  await db.batch(updates as [(typeof updates)[number], ...typeof updates]);
  return { ok: true };
}

// ── Children ─────────────────────────────────────────────────────────────────

async function applyChildren(
  productId: string,
  input: CreateProductInput | UpdateProductInput,
  actorId: string,
): Promise<void> {
  if (input.translations?.length) await upsertTranslations(productId, input.translations);
  if (input.attributes) await replaceAttributes(productId, input.attributes);
  if (input.images) await replaceImages(productId, input.images);
  if (input.options || input.variants) {
    await replaceOptionsAndVariants(productId, input.options ?? [], input.variants ?? [], actorId);
  }
}

async function upsertTranslations(
  productId: string,
  translations: ProductTranslationInput[],
): Promise<void> {
  try {
    for (const translation of translations) {
      const values = {
        name: translation.name,
        slug: translation.slug,
        description: translation.description ?? null,
        specsMd: translation.specsMd ?? null,
        seoTitle: translation.seoTitle ?? null,
        seoDescription: translation.seoDescription ?? null,
        isComplete: translation.isComplete ?? false,
        isMachineTranslated: translation.isMachineTranslated ?? false,
      };
      await db
        .insert(productTranslations)
        .values({ productId, locale: translation.locale, ...values })
        .onConflictDoUpdate({
          target: [productTranslations.productId, productTranslations.locale],
          set: values,
        });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Another product already uses that slug in this locale.');
    }
    throw error;
  }
}

// Attributes, images, options and variants are replace-not-merge: the admin form
// sends the complete list, so a removed row must actually disappear. Merging
// would make deletion impossible through the UI.
async function replaceAttributes(
  productId: string,
  attributes: NonNullable<CreateProductInput['attributes']>,
): Promise<void> {
  await db.delete(productAttributes).where(eq(productAttributes.productId, productId));
  if (attributes.length === 0) return;
  await db.insert(productAttributes).values(
    attributes.map((attribute, index) => ({
      productId,
      locale: attribute.locale,
      attrName: attribute.name,
      attrValue: attribute.value,
      sortOrder: attribute.sortOrder ?? index,
    })),
  );
}

async function replaceImages(
  productId: string,
  images: NonNullable<CreateProductInput['images']>,
): Promise<void> {
  await db.delete(productImages).where(eq(productImages.productId, productId));
  if (images.length === 0) return;
  // Exactly one primary: the first flagged, else the first image. Two primaries
  // would make the gallery's hero non-deterministic.
  const primaryIndex = Math.max(
    images.findIndex((image) => image.isPrimary),
    0,
  );
  await db.insert(productImages).values(
    images.map((image, index) => ({
      productId,
      url: image.url,
      altTranslations: image.alt ?? {},
      isPrimary: index === primaryIndex,
      sortOrder: image.sortOrder ?? index,
    })),
  );
}

/**
 * Rebuild options, their values, and the priced variants that reference them.
 *
 * Variants reference option values by the client-supplied `key`, not by database
 * id, because options are deleted and recreated on every save — their ids change
 * each time. So the order is fixed: recreate options and values first, building a
 * key → new-id map, then create variants and their value links from it.
 */
async function replaceOptionsAndVariants(
  productId: string,
  options: ProductOptionInput[],
  variants: ProductVariantInput[],
  actorId: string,
): Promise<void> {
  // Variants first: product_variant_option_values cascades from both sides, and
  // deleting options first would orphan the link rows mid-way.
  await db.delete(productVariants).where(eq(productVariants.productId, productId));
  await db.delete(productOptions).where(eq(productOptions.productId, productId));

  const valueIdByKey = new Map<string, string>();
  for (const [index, option] of options.entries()) {
    const [created] = await db
      .insert(productOptions)
      .values({
        productId,
        name: option.name,
        type: option.type,
        isVisible: option.isVisible ?? true,
        sortOrder: option.sortOrder ?? index,
      })
      .returning({ id: productOptions.id });

    for (const [valueIndex, value] of (option.values ?? []).entries()) {
      const [createdValue] = await db
        .insert(productOptionValues)
        .values({
          optionId: created.id,
          label: value.label,
          imageUrl: value.imageUrl ?? null,
          colorHex: value.colorHex ?? null,
          sortOrder: value.sortOrder ?? valueIndex,
        })
        .returning({ id: productOptionValues.id });
      if (value.key) valueIdByKey.set(value.key, createdValue.id);
    }
  }

  const now = new Date().toISOString();
  for (const [index, variant] of variants.entries()) {
    const priceSet = variant.basePriceAmount != null && variant.basePriceCurrency != null;
    const [created] = await db
      .insert(productVariants)
      .values({
        productId,
        sku: variant.sku ?? null,
        basePriceAmount: variant.basePriceAmount?.toString() ?? null,
        basePriceCurrency: variant.basePriceCurrency ?? null,
        ...(priceSet ? { basePriceUpdatedAt: now, basePriceUpdatedBy: actorId } : {}),
        moq: variant.moq ?? 1,
        packSize: variant.packSize ?? null,
        weightKg: variant.weightKg?.toString() ?? null,
        imageUrl: variant.imageUrl ?? null,
        isDefault: variant.isDefault ?? false,
        isActive: variant.isActive ?? true,
        sortOrder: variant.sortOrder ?? index,
      })
      .returning({ id: productVariants.id });

    const valueIds = (variant.optionValueKeys ?? [])
      .map((key) => valueIdByKey.get(key))
      .filter((id): id is string => Boolean(id));
    if (valueIds.length > 0) {
      await db
        .insert(productVariantOptionValues)
        .values(valueIds.map((optionValueId) => ({ variantId: created.id, optionValueId })));
    }
  }

  // Keep the product's own price / MOQ / pack in step with the default variant.
  // The storefront and the publish gate read the product row, not the variants,
  // so letting these drift would show one number and gate on another.
  const fallback = variants.find((variant) => variant.isDefault) ?? variants[0];
  if (fallback) {
    const priceSet = fallback.basePriceAmount != null && fallback.basePriceCurrency != null;
    await db
      .update(products)
      .set({
        basePriceAmount: fallback.basePriceAmount?.toString() ?? null,
        basePriceCurrency: fallback.basePriceCurrency ?? null,
        ...(priceSet ? { basePriceUpdatedAt: now, basePriceUpdatedBy: actorId } : {}),
        moq: fallback.moq ?? 1,
        packSize: fallback.packSize ?? null,
        updatedAt: now,
      })
      .where(eq(products.id, productId));
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function findActive(id: string) {
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), isNull(products.deletedAt)))
    .limit(1);
  if (!row) throw notFound('Product not found.');
  return row;
}

/** The narrow view the publish gate judges — nothing more is loaded for it. */
async function publishableView(id: string, row: typeof products.$inferSelect) {
  const [translations, [images], categoryStatus, supplierStatus] = await Promise.all([
    db.select().from(productTranslations).where(eq(productTranslations.productId, id)),
    db.select({ n: count() }).from(productImages).where(eq(productImages.productId, id)),
    row.categoryId
      ? db
          .select({ status: categories.status })
          .from(categories)
          .where(eq(categories.id, row.categoryId))
          .limit(1)
      : Promise.resolve([]),
    row.supplierId
      ? db
          .select({ status: suppliers.status })
          .from(suppliers)
          .where(eq(suppliers.id, row.supplierId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  return {
    sku: row.sku,
    basePriceAmount: row.basePriceAmount,
    basePriceCurrency: row.basePriceCurrency,
    imageCount: Number(images?.n ?? 0),
    translations: translations.map(toAdminTranslation),
    categoryStatus: categoryStatus[0]?.status ?? null,
    supplierStatus: supplierStatus[0]?.status ?? null,
  };
}

function toAdminTranslation(row: typeof productTranslations.$inferSelect): AdminTranslation {
  return {
    locale: row.locale,
    name: row.name,
    slug: row.slug,
    description: row.description,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    isComplete: row.isComplete,
    isMachineTranslated: row.isMachineTranslated,
  };
}

/**
 * Load full admin products for a set of ids, in the order given.
 *
 * Six queries regardless of how many products — the alternative is a query per
 * product per child table, which at a page of 20 is 120 round trips over HTTP.
 */
async function hydrate(ids: string[]): Promise<AdminProduct[]> {
  if (ids.length === 0) return [];

  const [rows, translations, images, attributes, options, values, variants, links] =
    await Promise.all([
      db.select().from(products).where(inArray(products.id, ids)),
      db.select().from(productTranslations).where(inArray(productTranslations.productId, ids)),
      db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, ids))
        .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder)),
      db
        .select()
        .from(productAttributes)
        .where(inArray(productAttributes.productId, ids))
        .orderBy(asc(productAttributes.sortOrder)),
      db
        .select()
        .from(productOptions)
        .where(inArray(productOptions.productId, ids))
        .orderBy(asc(productOptions.sortOrder)),
      db
        .select({
          id: productOptionValues.id,
          optionId: productOptionValues.optionId,
          label: productOptionValues.label,
          imageUrl: productOptionValues.imageUrl,
          colorHex: productOptionValues.colorHex,
          sortOrder: productOptionValues.sortOrder,
        })
        .from(productOptionValues)
        .innerJoin(productOptions, eq(productOptions.id, productOptionValues.optionId))
        .where(inArray(productOptions.productId, ids))
        .orderBy(asc(productOptionValues.sortOrder)),
      db
        .select()
        .from(productVariants)
        .where(inArray(productVariants.productId, ids))
        .orderBy(asc(productVariants.sortOrder)),
      db
        .select({
          variantId: productVariantOptionValues.variantId,
          optionValueId: productVariantOptionValues.optionValueId,
        })
        .from(productVariantOptionValues)
        .innerJoin(productVariants, eq(productVariants.id, productVariantOptionValues.variantId))
        .where(inArray(productVariants.productId, ids)),
    ]);

  const group = <T, K extends keyof T>(list: T[], key: K) => {
    const out = new Map<string, T[]>();
    for (const item of list) {
      const id = String(item[key]);
      out.set(id, [...(out.get(id) ?? []), item]);
    }
    return out;
  };

  const byProduct = new Map(rows.map((row) => [row.id, row]));
  const translationsBy = group(translations, 'productId');
  const imagesBy = group(images, 'productId');
  const attributesBy = group(attributes, 'productId');
  const optionsBy = group(options, 'productId');
  const valuesBy = group(values, 'optionId');
  const variantsBy = group(variants, 'productId');
  const linksBy = group(links, 'variantId');

  return ids
    .map((id) => byProduct.get(id))
    .filter((row): row is typeof products.$inferSelect => Boolean(row))
    .map((row) => ({
      id: row.id,
      sku: row.sku,
      status: row.status,
      isFeatured: row.isFeatured,
      sortOrder: row.sortOrder,
      moq: row.moq,
      unit: row.unit,
      boxQuantity: row.boxQuantity,
      packSize: row.packSize,
      hsCode: row.hsCode,
      brandName: row.brandName,
      countryOfOrigin: row.countryOfOrigin,
      gtin13: row.gtin13,
      mpn: row.mpn,
      weightKg: row.weightKg,
      cbm: row.cbm,
      basePriceAmount: row.basePriceAmount,
      basePriceCurrency: row.basePriceCurrency,
      categoryId: row.categoryId,
      supplierId: row.supplierId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      translations: (translationsBy.get(row.id) ?? []).map(toAdminTranslation),
      images: (imagesBy.get(row.id) ?? []).map((image) => ({
        url: resolveImageUrl(image.url),
        alt: (image.altTranslations ?? {}) as Record<string, string>,
        isPrimary: image.isPrimary,
        sortOrder: image.sortOrder,
      })),
      attributes: (attributesBy.get(row.id) ?? []).map((attribute) => ({
        locale: attribute.locale,
        name: attribute.attrName,
        value: attribute.attrValue,
        sortOrder: attribute.sortOrder,
      })),
      options: (optionsBy.get(row.id) ?? []).map((option) => ({
        id: option.id,
        name: option.name,
        type: option.type,
        isVisible: option.isVisible,
        sortOrder: option.sortOrder,
        values: (valuesBy.get(option.id) ?? []).map((value) => ({
          id: value.id,
          label: value.label,
          imageUrl: value.imageUrl,
          colorHex: value.colorHex,
        })),
      })),
      variants: (variantsBy.get(row.id) ?? []).map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        basePriceAmount: variant.basePriceAmount,
        basePriceCurrency: variant.basePriceCurrency,
        moq: variant.moq,
        packSize: variant.packSize,
        isDefault: variant.isDefault,
        isActive: variant.isActive,
        sortOrder: variant.sortOrder,
        optionValueIds: (linksBy.get(variant.id) ?? []).map((link) => link.optionValueId),
      })),
    }));
}

/** Category and supplier labels for the admin list's filter dropdowns. */
export async function productFilterOptions() {
  const [categoryRows, supplierRows] = await Promise.all([
    db
      .select({ id: categories.id, name: categoryTranslations.name })
      .from(categories)
      .leftJoin(
        categoryTranslations,
        and(
          eq(categoryTranslations.categoryId, categories.id),
          eq(categoryTranslations.locale, DEFAULT_LOCALE),
        ),
      )
      .where(isNull(categories.deletedAt))
      .orderBy(asc(categories.displayOrder)),
    db
      .select({ id: suppliers.id, name: supplierTranslations.name })
      .from(suppliers)
      .leftJoin(
        supplierTranslations,
        and(
          eq(supplierTranslations.supplierId, suppliers.id),
          eq(supplierTranslations.locale, DEFAULT_LOCALE),
        ),
      )
      .where(isNull(suppliers.deletedAt)),
  ]);

  return {
    categories: categoryRows.map((row) => ({ id: row.id, name: row.name ?? '—' })),
    suppliers: supplierRows.map((row) => ({ id: row.id, name: row.name ?? '—' })),
  };
}
