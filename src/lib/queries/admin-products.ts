/**
 * Admin-side catalogue reads. Price and supplier ARE allowed here.
 *
 * This is the other half of the enforcement rule: because the public shape in
 * public-product.ts has no price and no supplier *field*, anything that needs them
 * has to come from a different file with a different type — and that file is only
 * ever imported from /api/admin/*. There is no shared "product" type the two could
 * drift into.
 *
 * If you find yourself importing from this module in a Server Component under
 * src/app/[locale], stop: that is the leak.
 *
 * Step 8 extends this as each admin module is ported; the two reads here are what
 * a product list and a product detail need.
 */

import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  categoryTranslations,
  productImages,
  products,
  productTranslations,
  suppliers,
  supplierTranslations,
} from '@/lib/db/schema';
import { resolveImageUrl } from '@/lib/media/image-url';
import type { Locale } from './public-product';

export type AdminProductListItem = {
  id: string;
  sku: string | null;
  name: string;
  status: string;
  isFeatured: boolean;
  sortOrder: number;
  /** Admin-only. */
  basePriceAmount: string | null;
  basePriceCurrency: string | null;
  /** Admin-only. */
  supplier: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  primaryImageUrl: string | null;
  updatedAt: Date;
};

export type AdminProductFilter = {
  status?: string;
  categoryId?: string;
  supplierId?: string;
  search?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
};

// The admin UI is English-first; the list shows the English label and falls back
// to whichever translation exists so a product is never nameless in the table.
const ADMIN_LABEL_LOCALE: Locale = 'en';

export async function adminProducts(filter: AdminProductFilter = {}): Promise<{
  items: AdminProductListItem[];
  total: number;
}> {
  const conditions = [];
  if (!filter.includeDeleted) conditions.push(isNull(products.deletedAt));
  if (filter.status) conditions.push(eq(products.status, filter.status));
  if (filter.categoryId) conditions.push(eq(products.categoryId, filter.categoryId));
  if (filter.supplierId) conditions.push(eq(products.supplierId, filter.supplierId));
  if (filter.search) {
    const term = `%${filter.search}%`;
    conditions.push(or(ilike(products.sku, term), ilike(productTranslations.name, term)));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  let listQuery = db
    .select({
      id: products.id,
      sku: products.sku,
      status: products.status,
      isFeatured: products.isFeatured,
      sortOrder: products.sortOrder,
      basePriceAmount: products.basePriceAmount,
      basePriceCurrency: products.basePriceCurrency,
      supplierId: products.supplierId,
      categoryId: products.categoryId,
      updatedAt: products.updatedAt,
      name: productTranslations.name,
    })
    .from(products)
    .leftJoin(
      productTranslations,
      and(
        eq(productTranslations.productId, products.id),
        eq(productTranslations.locale, ADMIN_LABEL_LOCALE),
      ),
    )
    .where(where)
    .orderBy(asc(products.sortOrder), desc(products.updatedAt))
    .$dynamic();

  if (filter.limit !== undefined) listQuery = listQuery.limit(filter.limit);
  if (filter.offset !== undefined) listQuery = listQuery.offset(filter.offset);

  const [rows, [countRow]] = await Promise.all([
    listQuery,
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .leftJoin(
        productTranslations,
        and(
          eq(productTranslations.productId, products.id),
          eq(productTranslations.locale, ADMIN_LABEL_LOCALE),
        ),
      )
      .where(where),
  ]);

  if (rows.length === 0) return { items: [], total: countRow?.count ?? 0 };

  const supplierIds = [...new Set(rows.map((r) => r.supplierId).filter((id) => id !== null))];
  const categoryIds = [...new Set(rows.map((r) => r.categoryId).filter((id) => id !== null))];
  const productIds = rows.map((r) => r.id);

  const [supplierNames, categoryNames, primaryImages] = await Promise.all([
    supplierLabels(supplierIds),
    categoryLabels(categoryIds),
    primaryImageUrls(productIds),
  ]);

  return {
    total: countRow?.count ?? rows.length,
    items: rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name ?? row.sku ?? row.id,
      status: row.status,
      isFeatured: row.isFeatured,
      sortOrder: row.sortOrder,
      basePriceAmount: row.basePriceAmount,
      basePriceCurrency: row.basePriceCurrency,
      supplier: row.supplierId
        ? { id: row.supplierId, name: supplierNames.get(row.supplierId) ?? '—' }
        : null,
      category: row.categoryId
        ? { id: row.categoryId, name: categoryNames.get(row.categoryId) ?? '—' }
        : null,
      primaryImageUrl: primaryImages.get(row.id) ?? null,
      updatedAt: new Date(row.updatedAt),
    })),
  };
}

export async function adminProduct(id: string) {
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!row) return null;

  const [translations, images, supplierName] = await Promise.all([
    db.select().from(productTranslations).where(eq(productTranslations.productId, id)),
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder)),
    row.supplierId ? supplierLabels([row.supplierId]) : Promise.resolve(new Map<string, string>()),
  ]);

  return {
    ...row,
    updatedAt: new Date(row.updatedAt),
    translations,
    images,
    supplierName: row.supplierId ? (supplierName.get(row.supplierId) ?? null) : null,
  };
}

async function supplierLabels(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  const rows = await db
    .select({ id: suppliers.id, name: supplierTranslations.name })
    .from(suppliers)
    .leftJoin(
      supplierTranslations,
      and(
        eq(supplierTranslations.supplierId, suppliers.id),
        eq(supplierTranslations.locale, ADMIN_LABEL_LOCALE),
      ),
    )
    .where(inArray(suppliers.id, ids));
  for (const row of rows) if (row.name) out.set(row.id, row.name);
  return out;
}

async function categoryLabels(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  const rows = await db
    .select({ id: categoryTranslations.categoryId, name: categoryTranslations.name })
    .from(categoryTranslations)
    .where(
      and(
        inArray(categoryTranslations.categoryId, ids),
        eq(categoryTranslations.locale, ADMIN_LABEL_LOCALE),
      ),
    );
  for (const row of rows) out.set(row.id, row.name);
  return out;
}

async function primaryImageUrls(productIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (productIds.length === 0) return out;
  const rows = await db
    .select({ productId: productImages.productId, url: productImages.url })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder));
  for (const row of rows)
    if (!out.has(row.productId)) out.set(row.productId, resolveImageUrl(row.url));
  return out;
}
