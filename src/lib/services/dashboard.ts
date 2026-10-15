import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  auditLog,
  authUser,
  categories,
  productImages,
  products,
  productTranslations,
  suppliers,
} from '@/lib/db/schema';
import { LOCALES } from '@/lib/services/catalog-schemas';
import { extractAuditDetails } from '@/lib/services/audit-log';

/** Dashboard metrics aggregating live catalog KPIs and publish-readiness counts. */

export interface DashboardActivityItem {
  id: string;
  icon: 'inbox' | 'check' | 'search' | 'alert';
  tone: 'primary' | 'success' | 'accent' | 'warning';
  before: string;
  strong: string;
  after: string;
  meta: string;
}

export interface DashboardData {
  kpis: { label: string; value: string; delta?: string; tone?: 'up' | 'down' | 'warn' }[];
  publishSummary: {
    label: string;
    value: number;
    hint?: string;
    valueTone?: 'success' | 'warning' | 'destructive';
    action?: { label: string; to: string };
  }[];
  activity: DashboardActivityItem[];
}

function mapAuditToneAndIcon(action: string): {
  icon: DashboardActivityItem['icon'];
  tone: DashboardActivityItem['tone'];
} {
  if (
    action.endsWith('.created') ||
    action.endsWith('.published') ||
    action.endsWith('.invited') ||
    action.endsWith('.reactivated') ||
    action.endsWith('.restored')
  ) {
    return { icon: 'check', tone: 'success' };
  }
  if (
    action.endsWith('.deleted') ||
    action.endsWith('.suspended') ||
    action.endsWith('.archived') ||
    action.endsWith('.role_revoked') ||
    action.endsWith('.unpublished')
  ) {
    return { icon: 'alert', tone: 'warning' };
  }
  return { icon: 'inbox', tone: 'primary' };
}

export async function dashboardSummary(): Promise<DashboardData> {
  const live = isNull(products.deletedAt);

  const [
    statusRows,
    [categoryCount],
    [supplierCount],
    [missingImage],
    [missingTranslation],
    recentLogs,
  ] = await Promise.all([
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

    db
      .select({
        id: auditLog.id,
        createdAt: auditLog.createdAt,
        actorType: auditLog.actorType,
        actorName: authUser.name,
        action: auditLog.action,
        resourceType: auditLog.resourceType,
        resourceId: auditLog.resourceId,
        afterState: auditLog.afterState,
      })
      .from(auditLog)
      .leftJoin(authUser, eq(auditLog.actorId, authUser.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(5),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((row) => [row.status, Number(row.n)]));
  const published = byStatus.published ?? 0;
  const draft = byStatus.draft ?? 0;
  const archived = byStatus.archived ?? 0;

  const activity: DashboardActivityItem[] = recentLogs.map((row) => {
    const { summary } = extractAuditDetails(
      row.action,
      row.resourceType,
      row.resourceId,
      row.afterState,
    );
    const { icon, tone } = mapAuditToneAndIcon(row.action);
    const actor = row.actorName ?? (row.actorType === 'system' ? 'System' : 'Admin');
    return {
      id: row.id,
      icon,
      tone,
      before: `${actor}: `,
      strong: summary,
      after: '',
      meta: `${row.action} · ${new Date(row.createdAt).toLocaleString()}`,
    };
  });

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
    activity,
  };
}
