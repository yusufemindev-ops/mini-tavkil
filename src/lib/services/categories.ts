import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories, categoryTranslations } from '@/lib/db/schema';
import { conflict, isUniqueViolation, invalid, notFound } from '@/lib/api/errors';
import {
  assertCategoryPublishable,
  DEFAULT_LOCALE,
  type AdminCategory,
  type AdminTranslation,
} from '@/lib/services/publish-gates';
import type {
  CreateCategoryInput,
  TranslationInput,
  UpdateCategoryInput,
} from '@/lib/services/catalog-schemas';

/**
 * Category service, ported from Tavkil's Nest service.
 *
 * What carried over unchanged is the business logic: the publish gate, the
 * reorder-is-atomic rule, the draft-first stance. What was rewritten is every
 * query — Prisma to Drizzle.
 *
 * What was dropped:
 *   - audit-log writes (the feature is cut, PLAN.md §3)
 *   - the public read methods. Tavkil's storefront fetched categories over HTTP;
 *     ours is Server Components reading the database directly through
 *     lib/queries/public-product.ts. A public JSON endpoint here would be an
 *     un-consumed surface, and one more place a price or supplier could leak.
 */

export type { AdminCategory, AdminTranslation };
export { assertCategoryPublishable, DEFAULT_LOCALE };

const PUBLISHED = 'published';
const DRAFT = 'draft';

// ── Reads ────────────────────────────────────────────────────────────────────

export async function listCategories(): Promise<AdminCategory[]> {
  const rows = await db
    .select()
    .from(categories)
    .where(isNull(categories.deletedAt))
    .orderBy(asc(categories.displayOrder), asc(categories.createdAt));

  if (rows.length === 0) return [];
  const translations = await translationsFor(rows.map((row) => row.id));
  return rows.map((row) => toAdminCategory(row, translations.get(row.id) ?? []));
}

export async function getCategory(id: string): Promise<AdminCategory> {
  const row = await findActive(id);
  const translations = await translationsFor([id]);
  return toAdminCategory(row, translations.get(id) ?? []);
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createCategory(input: CreateCategoryInput): Promise<AdminCategory> {
  const [row] = await db
    .insert(categories)
    .values({
      parentId: input.parentId ?? null,
      imageUrl: input.imageUrl ?? null,
      displayOrder: input.displayOrder ?? 0,
    })
    .returning();

  if (input.translations?.length) {
    await upsertTranslations(row.id, input.translations);
  }
  return getCategory(row.id);
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<AdminCategory> {
  await findActive(id);

  if (input.parentId !== undefined && input.parentId === id) {
    throw invalid('A category cannot be its own parent.');
  }

  const patch: Record<string, unknown> = {};
  if (input.parentId !== undefined) patch.parentId = input.parentId;
  if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl;
  if (input.displayOrder !== undefined) patch.displayOrder = input.displayOrder;
  if (input.status !== undefined) patch.status = input.status;
  if (input.sortStrategy !== undefined) patch.sortStrategy = input.sortStrategy;

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = new Date().toISOString();
    await db.update(categories).set(patch).where(eq(categories.id, id));
  }
  if (input.translations?.length) await upsertTranslations(id, input.translations);

  return getCategory(id);
}

/** Soft delete. The row stays so historical references keep resolving. */
export async function deleteCategory(id: string): Promise<{ id: string }> {
  await findActive(id);
  await db
    .update(categories)
    .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(categories.id, id));
  return { id };
}

/**
 * Bulk reorder a sibling group: each id's display_order becomes its position.
 *
 * All-or-nothing on purpose. Tavkil used an interactive transaction; Neon HTTP has
 * none on a request path (CLAUDE.md §3), so this is `db.batch`, which is still one
 * round trip and still atomic. A half-applied reorder would leave the catalogue in
 * an order nobody chose.
 */
export async function reorderCategories(ids: string[]): Promise<{ ok: true }> {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(inArray(categories.id, ids), isNull(categories.deletedAt)));

  const found = new Set(rows.map((row) => row.id));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length > 0) throw notFound('One or more categories not found.');

  const now = new Date().toISOString();
  const updates = ids.map((id, index) =>
    db
      .update(categories)
      .set({ displayOrder: index + 1, updatedAt: now })
      .where(eq(categories.id, id)),
  );
  await db.batch(updates as [(typeof updates)[number], ...typeof updates]);
  return { ok: true };
}

export async function publishCategory(id: string): Promise<AdminCategory> {
  const category = await getCategory(id);
  assertCategoryPublishable(category);
  await db
    .update(categories)
    .set({ status: PUBLISHED, updatedAt: new Date().toISOString() })
    .where(eq(categories.id, id));
  return getCategory(id);
}

export async function unpublishCategory(id: string): Promise<AdminCategory> {
  await findActive(id);
  await db
    .update(categories)
    .set({ status: DRAFT, updatedAt: new Date().toISOString() })
    .where(eq(categories.id, id));
  return getCategory(id);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function findActive(id: string) {
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
    .limit(1);
  if (!row) throw notFound('Category not found.');
  return row;
}

async function translationsFor(ids: string[]): Promise<Map<string, AdminTranslation[]>> {
  const out = new Map<string, AdminTranslation[]>();
  if (ids.length === 0) return out;
  const rows = await db
    .select()
    .from(categoryTranslations)
    .where(inArray(categoryTranslations.categoryId, ids))
    .orderBy(asc(categoryTranslations.locale));
  for (const row of rows) {
    out.set(row.categoryId, [
      ...(out.get(row.categoryId) ?? []),
      {
        locale: row.locale,
        name: row.name,
        slug: row.slug,
        description: row.description,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        isComplete: row.isComplete,
        isMachineTranslated: row.isMachineTranslated,
      },
    ]);
  }
  return out;
}

/**
 * Upsert one translation per (category, locale).
 *
 * The (locale, slug) unique index is what stops two categories claiming the same
 * URL. Translating that violation into a 409 with a readable message is the
 * difference between an admin fixing their slug and filing a bug.
 */
async function upsertTranslations(
  categoryId: string,
  translations: TranslationInput[],
): Promise<void> {
  try {
    for (const translation of translations) {
      await db
        .insert(categoryTranslations)
        .values({
          categoryId,
          locale: translation.locale,
          name: translation.name,
          slug: translation.slug,
          description: translation.description ?? null,
          seoTitle: translation.seoTitle ?? null,
          seoDescription: translation.seoDescription ?? null,
          isComplete: translation.isComplete ?? false,
          isMachineTranslated: translation.isMachineTranslated ?? false,
        })
        .onConflictDoUpdate({
          target: [categoryTranslations.categoryId, categoryTranslations.locale],
          set: {
            name: translation.name,
            slug: translation.slug,
            description: translation.description ?? null,
            seoTitle: translation.seoTitle ?? null,
            seoDescription: translation.seoDescription ?? null,
            isComplete: translation.isComplete ?? false,
            isMachineTranslated: translation.isMachineTranslated ?? false,
          },
        });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Another category already uses that slug in this locale.');
    }
    throw error;
  }
}

function toAdminCategory(
  row: typeof categories.$inferSelect,
  translations: AdminTranslation[],
): AdminCategory {
  return {
    id: row.id,
    parentId: row.parentId,
    imageUrl: row.imageUrl,
    displayOrder: row.displayOrder,
    status: row.status,
    sortStrategy: row.sortStrategy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    translations,
  };
}

/** Product counts per category, for the admin list. */
export async function categoryProductCounts(): Promise<Map<string, number>> {
  const rows = await db.execute<{ category_id: string; n: number }>(
    sql`select category_id, count(*)::int as n
          from products
         where deleted_at is null and category_id is not null
      group by category_id`,
  );
  return new Map(rows.rows.map((row) => [row.category_id, row.n]));
}
