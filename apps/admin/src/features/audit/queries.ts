import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export type AuditResourceType =
  | 'product'
  | 'category'
  | 'supplier'
  | 'buyer'
  | 'account_request'
  | 'order'
  | 'settings'
  | 'currency'
  | 'user'
  | 'media';

export interface AdminAuditLogRow {
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

export interface AuditLogListParams {
  page?: number;
  pageSize?: number;
  resourceType?: AuditResourceType;
  search?: string;
}

export interface AuditLogPageResult {
  items: AdminAuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const auditKeys = {
  all: ['audit-logs'] as const,
  list: (params: AuditLogListParams) => ['audit-logs', 'list', params] as const,
};

function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function useAuditLogs(params: AuditLogListParams) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () =>
      api.get<AuditLogPageResult>(
        `/admin/audit-logs${buildQuery({
          page: params.page,
          pageSize: params.pageSize,
          resourceType: params.resourceType,
          search: params.search,
        })}`,
      ),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

export function actionBadgeVariant(
  action: string,
): 'success' | 'warning' | 'destructive' | 'primary' | 'secondary' {
  if (
    action.endsWith('.created') ||
    action.endsWith('.published') ||
    action.endsWith('.invited') ||
    action.endsWith('.reactivated') ||
    action.endsWith('.restored') ||
    action.endsWith('.approved') ||
    action.endsWith('.confirmed') ||
    action.endsWith('.verified') ||
    action.endsWith('.reopened')
  ) {
    return 'success';
  }
  if (
    action.endsWith('.deleted') ||
    action.endsWith('.suspended') ||
    action.endsWith('.archived') ||
    action.endsWith('.role_revoked') ||
    action.endsWith('.rejected')
  ) {
    return 'destructive';
  }
  if (action.endsWith('.unpublished') || action.endsWith('.unverified')) {
    return 'warning';
  }
  if (
    action.endsWith('.updated') ||
    action.endsWith('.reordered') ||
    action.endsWith('.role_assigned') ||
    action.endsWith('.fx_refreshed') ||
    action.endsWith('.assigned')
  ) {
    return 'primary';
  }
  return 'secondary';
}
