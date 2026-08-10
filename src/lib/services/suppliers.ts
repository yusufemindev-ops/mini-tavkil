import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { suppliers, supplierTranslations } from '@/lib/db/schema';
import { conflict, invalid, isUniqueViolation, notFound } from '@/lib/api/errors';
import { DEFAULT_LOCALE, type AdminTranslation } from '@/lib/services/publish-gates';
import { translationSchema, type TranslationInput } from '@/lib/services/catalog-schemas';

/**
 * Suppliers — internal records with no public surface at all.
 *
 * There is no public read here and there never will be: a supplier name on an
 * anonymous response is the leak this project is built to prevent (CLAUDE.md §1).
 * `contactEmailInternal`, `contactPhoneInternal` and `internalNotes` make that
 * obvious in the column names, but the whole table is admin-only, not just those.
 *
 * Suppliers still matter to the storefront indirectly: a product cannot be
 * published unless its supplier is (see publish-gates).
 */

export const createSupplierSchema = z.object({
  countryCode: z.string().trim().length(2),
  logoUrl: z.string().trim().min(1).nullable().optional(),
  website: z.string().trim().min(1).nullable().optional(),
  contactEmailInternal: z.string().trim().email().nullable().optional(),
  contactPhoneInternal: z.string().trim().min(1).nullable().optional(),
  isVerified: z.boolean().optional(),
  internalNotes: z.string().trim().min(1).nullable().optional(),
  address: z.string().trim().min(1).max(300).nullable().optional(),
  mapUrl: z.string().trim().url().nullable().optional(),
  // Draft-first, like categories: the publish gate enforces the English name.
  translations: z.array(translationSchema).optional(),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  // Draft or published only — archive belongs to products.
  status: z.enum(['draft', 'published']).optional(),
});
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export interface AdminSupplier {
  id: string;
  countryCode: string;
  logoUrl: string | null;
  website: string | null;
  contactEmailInternal: string | null;
  contactPhoneInternal: string | null;
  isVerified: boolean;
  internalNotes: string | null;
  address: string | null;
  mapUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  translations: AdminTranslation[];
}

/**
 * A supplier needs an English name to publish — nothing else.
 *
 * Lighter than the product gate on purpose: a supplier is never rendered on its
 * own page, so the only thing that must exist is something to call it in the
 * admin and in the product publish check.
 */
export function assertSupplierPublishable(supplier: AdminSupplier): void {
  const english = supplier.translations.find((t) => t.locale === DEFAULT_LOCALE);
  if (!english || !english.name.trim()) {
    throw invalid(`Cannot publish: missing a '${DEFAULT_LOCALE}' translation with a name.`);
  }
}

export async function listSuppliers(): Promise<AdminSupplier[]> {
  const rows = await db
    .select()
    .from(suppliers)
    .where(isNull(suppliers.deletedAt))
    .orderBy(asc(suppliers.createdAt));
  if (rows.length === 0) return [];
  const translations = await translationsFor(rows.map((row) => row.id));
  return rows.map((row) => toAdminSupplier(row, translations.get(row.id) ?? []));
}

export async function getSupplier(id: string): Promise<AdminSupplier> {
  const row = await findActive(id);
  const translations = await translationsFor([id]);
  return toAdminSupplier(row, translations.get(id) ?? []);
}

export async function createSupplier(input: CreateSupplierInput): Promise<AdminSupplier> {
  const [row] = await db
    .insert(suppliers)
    .values({
      countryCode: input.countryCode.toUpperCase(),
      logoUrl: input.logoUrl ?? null,
      website: input.website ?? null,
      contactEmailInternal: input.contactEmailInternal ?? null,
      contactPhoneInternal: input.contactPhoneInternal ?? null,
      isVerified: input.isVerified ?? false,
      internalNotes: input.internalNotes ?? null,
      address: input.address ?? null,
      mapUrl: input.mapUrl ?? null,
    })
    .returning();

  if (input.translations?.length) await upsertTranslations(row.id, input.translations);
  return getSupplier(row.id);
}

export async function updateSupplier(
  id: string,
  input: UpdateSupplierInput,
): Promise<AdminSupplier> {
  await findActive(id);

  const patch: Record<string, unknown> = {};
  const fields = [
    'logoUrl',
    'website',
    'contactEmailInternal',
    'contactPhoneInternal',
    'isVerified',
    'internalNotes',
    'address',
    'mapUrl',
    'status',
  ] as const;
  for (const field of fields) {
    if (input[field] !== undefined) patch[field] = input[field];
  }
  if (input.countryCode !== undefined) patch.countryCode = input.countryCode.toUpperCase();

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = new Date().toISOString();
    await db.update(suppliers).set(patch).where(eq(suppliers.id, id));
  }
  if (input.translations?.length) await upsertTranslations(id, input.translations);
  return getSupplier(id);
}

export async function deleteSupplier(id: string): Promise<{ id: string }> {
  await findActive(id);
  const now = new Date().toISOString();
  await db.update(suppliers).set({ deletedAt: now, updatedAt: now }).where(eq(suppliers.id, id));
  return { id };
}

export async function publishSupplier(id: string): Promise<AdminSupplier> {
  const supplier = await getSupplier(id);
  assertSupplierPublishable(supplier);
  await db
    .update(suppliers)
    .set({ status: 'published', updatedAt: new Date().toISOString() })
    .where(eq(suppliers.id, id));
  return getSupplier(id);
}

export async function unpublishSupplier(id: string): Promise<AdminSupplier> {
  await findActive(id);
  await db
    .update(suppliers)
    .set({ status: 'draft', updatedAt: new Date().toISOString() })
    .where(eq(suppliers.id, id));
  return getSupplier(id);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function findActive(id: string) {
  const [row] = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, id), isNull(suppliers.deletedAt)))
    .limit(1);
  if (!row) throw notFound('Supplier not found.');
  return row;
}

async function translationsFor(ids: string[]): Promise<Map<string, AdminTranslation[]>> {
  const out = new Map<string, AdminTranslation[]>();
  if (ids.length === 0) return out;
  const rows = await db
    .select()
    .from(supplierTranslations)
    .where(inArray(supplierTranslations.supplierId, ids))
    .orderBy(asc(supplierTranslations.locale));
  for (const row of rows) {
    out.set(row.supplierId, [
      ...(out.get(row.supplierId) ?? []),
      {
        locale: row.locale,
        name: row.name,
        slug: row.slug,
        description: row.description,
        seoTitle: null,
        seoDescription: null,
        isComplete: row.isComplete,
        isMachineTranslated: row.isMachineTranslated,
      },
    ]);
  }
  return out;
}

async function upsertTranslations(
  supplierId: string,
  translations: TranslationInput[],
): Promise<void> {
  try {
    for (const translation of translations) {
      const values = {
        name: translation.name,
        slug: translation.slug,
        description: translation.description ?? null,
        isComplete: translation.isComplete ?? false,
        isMachineTranslated: translation.isMachineTranslated ?? false,
      };
      await db
        .insert(supplierTranslations)
        .values({ supplierId, locale: translation.locale, ...values })
        .onConflictDoUpdate({
          target: [supplierTranslations.supplierId, supplierTranslations.locale],
          set: values,
        });
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('Another supplier already uses that slug in this locale.');
    }
    throw error;
  }
}

function toAdminSupplier(
  row: typeof suppliers.$inferSelect,
  translations: AdminTranslation[],
): AdminSupplier {
  return {
    id: row.id,
    countryCode: row.countryCode,
    logoUrl: row.logoUrl,
    website: row.website,
    contactEmailInternal: row.contactEmailInternal,
    contactPhoneInternal: row.contactPhoneInternal,
    isVerified: row.isVerified,
    internalNotes: row.internalNotes,
    address: row.address,
    mapUrl: row.mapUrl,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    translations,
  };
}
