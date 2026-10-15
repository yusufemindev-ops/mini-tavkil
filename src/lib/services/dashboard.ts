import { and, count, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  categories,
  productImages,
  products,
  productTranslations,
  suppliers,
} from '@/lib/db/schema';
import { LOCALES } from '@/lib/services/catalog-schemas';

/** Dashboard metrics aggregating live catalog KPIs and publish-readiness counts. */

export interface DashboardData {
  kpis: { label: string; value: string; delta?: string; tone?: 'up' | 'down' | 'warn' }[];
  publishSummary: {
    label: string;
    value: number;
    hint?: string;
    valueTone?: 'success' | 'warning' | 'destructive';
    action?: { label: string; to: string };
  }[];
  activity: never[];
}

export async function dashboardSummary(): Promise<DashboardData> {
  const live = isNull(products.deletedAt);

  const [statusRows, [categoryCount], [supplierCount], [missingImage], [missingTranslation]] =
    await Promise.all([
      db
        .select({ status: products.status, n: count() })
        .from(products)
        .where(live)
        .groupBy(products.status),

      db
        .select({ n: count() })
        .from(categories)
        .where(and(isNull(categories.deletedAt), eq(categories.status, 'published'))),

      db
        .select({ n: count() })
        .from(suppliers)
        .where(and(isNull(suppliers.deletedAt), eq(suppliers.status, 'published'))),

      // Count published products lacking images.
      db
        .select({ n: count() })
        .from(products)
        .where(
          and(
            live,
            eq(products.status, 'published'),
            sql`not exists (select 1 from ${productImages} where ${productImages.productId} = ${products.id})`,
          ),
        ),

      // Count published products missing complete translations across all locales.
      db
        .select({ n: count() })
        .from(products)
        .where(
          and(
            live,
            eq(products.status, 'published'),
            sql`(select count(*) from ${productTranslations}
                   where ${productTranslations.productId} = ${products.id}
                     and ${productTranslations.isComplete} = true) < ${LOCALES.length}`,
          ),
        ),
    ]);

  const byStatus = Object.fromEntries(statusRows.map((row) => [row.status, Number(row.n)]));
  const published = byStatus.published ?? 0;
  const draft = byStatus.draft ?? 0;
  const archived = byStatus.archived ?? 0;

  return {
    kpis: [
      { label: 'Published products', value: String(published), tone: 'up' },
      {
        label: 'Drafts',
        value: String(draft),
        delta: draft > 0 ? 'Not on the storefront' : undefined,
      },
      { label: 'Published categories', value: String(categoryCount?.n ?? 0) },
      { label: 'Published suppliers', value: String(supplierCount?.n ?? 0) },
    ],
    publishSummary: [
      { label: 'Published products', value: published, valueTone: 'success' },
      { label: 'Draft', value: draft, hint: 'Awaiting completion' },
      { label: 'Archived', value: archived, hint: 'Discontinued' },
      {
        label: 'Missing primary image',
        value: Number(missingImage?.n ?? 0),
        hint: 'Published, but the storefront card has no photo',
        valueTone: Number(missingImage?.n ?? 0) > 0 ? 'destructive' : undefined,
        action: { label: 'Review', to: '/products?status=published' },
      },
      {
        label: 'Missing translations',
        value: Number(missingTranslation?.n ?? 0),
        hint: `Published, but not complete in all ${LOCALES.length} locales`,
        valueTone: Number(missingTranslation?.n ?? 0) > 0 ? 'warning' : undefined,
        action: { label: 'Review', to: '/products?status=published' },
      },
    ],
    // Activity feed defaults to empty array until audit log ingestion is wired.
    activity: [],
  };
}
