import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auditLog, authUser } from '@/lib/db/schema';
import type { AuditResourceType, ListAuditLogsQuery } from '@/lib/services/audit-log-schema';

export interface RecordAuditInput {
  actorId?: string | null;
  actorType?: 'user' | 'buyer' | 'system';
  action: string;
  resourceType: AuditResourceType;
  resourceId?: string | null;
  target?: string | null;
  summary: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AdminAuditLogItem {
  id: string;
  createdAt: string;
  actor: {
    id: string | null;
    name: string;
    email: string | null;
    type: string;
  };
  action: string;
  resourceType: string;
  resourceId: string | null;
  target: string;
  summary: string;
  ipAddress: string | null;
}

export interface AdminAuditLogPage {
  items: AdminAuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]+$/;

/** Extracts a valid IPv4/IPv6 for the Postgres `inet` column, or `null`. */
export function sanitizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const first = raw.split(',')[0]?.trim() ?? '';
  if (!first) return null;
  if (IPV4_RE.test(first)) {
    const octets = first.split('.').map(Number);
    return octets.every((n) => n >= 0 && n <= 255) ? first : null;
  }
  if (first.includes(':') && IPV6_RE.test(first)) return first;
  return null;
}

const UUID_EXACT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_INLINE_RE = /\b([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** Extracts a clean human-readable summary and target from `after_state`. */
export function extractAuditDetails(
  action: string,
  resourceType: string,
  resourceId: string | null,
  afterState: unknown,
): { target: string; summary: string } {
  const obj =
    afterState && typeof afterState === 'object' && !Array.isArray(afterState)
      ? (afterState as Record<string, unknown>)
      : {};

  const rawTarget =
    (typeof obj.target === 'string' && obj.target.trim()) ||
    (typeof obj.label === 'string' && obj.label.trim()) ||
    (typeof obj.name === 'string' && obj.name.trim()) ||
    (typeof obj.sku === 'string' && obj.sku.trim()) ||
    (typeof obj.email === 'string' && obj.email.trim()) ||
    resourceId ||
    '—';

  const rawSummary =
    (typeof obj.summary === 'string' && obj.summary.trim()) ||
    `${action.replace(/[._]/g, ' ')} (${resourceType})`;

  const target = UUID_EXACT_RE.test(rawTarget) ? `#${rawTarget.slice(0, 8)}` : rawTarget;
  const summary = rawSummary.replace(UUID_INLINE_RE, '#$1');

  return { target, summary };
}

/** Writes an audit log entry without failing the parent request on error. */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    await db.insert(auditLog).values({
      actorType: input.actorType ?? 'user',
      actorId: input.actorId ?? null,
      authMethod: input.actorType === 'system' ? 'system' : 'session',
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ? String(input.resourceId) : null,
      afterState: {
        target: input.target ?? input.resourceId ?? null,
        summary: input.summary,
      },
      ipAddress: sanitizeIp(input.ipAddress),
      userAgent: input.userAgent?.slice(0, 500) ?? null,
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
}

/** Returns a bounded, paginated page of admin activity logs. */
export async function listAuditLogs(query: ListAuditLogsQuery): Promise<AdminAuditLogPage> {
  const { page, pageSize, resourceType, search } = query;
  const offset = (page - 1) * pageSize;

  const filters = [];
  if (resourceType) {
    filters.push(eq(auditLog.resourceType, resourceType));
  }
  if (search) {
    const pattern = `%${search}%`;
    filters.push(
      or(
        ilike(auditLog.action, pattern),
        ilike(auditLog.resourceType, pattern),
        ilike(auditLog.resourceId, pattern),
        ilike(authUser.name, pattern),
        ilike(authUser.email, pattern),
        sql`${auditLog.afterState}->>'target' ILIKE ${pattern}`,
        sql`${auditLog.afterState}->>'summary' ILIKE ${pattern}`,
      ),
    );
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        createdAt: auditLog.createdAt,
        actorType: auditLog.actorType,
        actorId: auditLog.actorId,
        actorName: authUser.name,
        actorEmail: authUser.email,
        action: auditLog.action,
        resourceType: auditLog.resourceType,
        resourceId: auditLog.resourceId,
        afterState: auditLog.afterState,
        ipAddress: auditLog.ipAddress,
      })
      .from(auditLog)
      .leftJoin(authUser, eq(auditLog.actorId, authUser.id))
      .where(whereClause)
      .orderBy(desc(auditLog.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(auditLog)
      .leftJoin(authUser, eq(auditLog.actorId, authUser.id))
      .where(whereClause),
  ]);

  const items: AdminAuditLogItem[] = rows.map((row) => {
    const { target, summary } = extractAuditDetails(
      row.action,
      row.resourceType,
      row.resourceId,
      row.afterState,
    );
    return {
      id: row.id,
      createdAt: row.createdAt,
      actor: {
        id: row.actorId,
        name: row.actorName ?? (row.actorType === 'system' ? 'System' : 'Admin'),
        email: row.actorEmail ?? null,
        type: row.actorType,
      },
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      target,
      summary,
      ipAddress: row.ipAddress,
    };
  });

  return {
    items,
    total: Number(total ?? 0),
    page,
    pageSize,
  };
}
