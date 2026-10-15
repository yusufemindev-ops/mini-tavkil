import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { TableSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  actionBadgeVariant,
  useAuditLogs,
  type AdminAuditLogRow,
  type AuditResourceType,
} from './queries';

const PAGE_SIZE = 25;

const RESOURCE_FILTERS: { id: AuditResourceType | 'all'; label: string }[] = [
  { id: 'all', label: 'All activity' },
  { id: 'product', label: 'Products' },
  { id: 'category', label: 'Categories' },
  { id: 'supplier', label: 'Suppliers' },
  { id: 'user', label: 'Users' },
  { id: 'settings', label: 'Settings' },
  { id: 'currency', label: 'Currencies' },
];

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [resourceFilter, setResourceFilter] = useState<AuditResourceType | 'all'>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useAuditLogs({
    page,
    pageSize: PAGE_SIZE,
    resourceType: resourceFilter === 'all' ? undefined : resourceFilter,
    search: search.trim() || undefined,
  });

  const rows: AdminAuditLogRow[] = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Chronological activity history of administrative changes across the catalog and team."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {RESOURCE_FILTERS.map((f) => {
            const active = resourceFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setResourceFilter(f.id);
                  setPage(1);
                }}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search actor, action, target…"
            className="pr-7 pl-8 text-xs"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <Panel>
        <PanelBody tight>
          {isLoading && rows.length === 0 ? (
            <TableSkeleton
              rows={8}
              columns={[
                { header: 'Time', cell: 'text' },
                { header: 'Actor', cell: 'text' },
                { header: 'Action', cell: 'badge' },
                { header: 'Target', cell: 'text' },
                { header: 'Summary', cell: 'text' },
              ]}
            />
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-sm">
              No audit log entries match the current filters.
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td
                      className="text-muted-foreground text-xs whitespace-nowrap"
                      title={new Date(row.createdAt).toLocaleString()}
                    >
                      {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                    </td>
                    <td>
                      <div className="text-foreground text-[13px] font-medium">
                        {row.actor.name}
                      </div>
                      {row.actor.email && (
                        <div className="text-muted-foreground text-[11px]">{row.actor.email}</div>
                      )}
                    </td>
                    <td>
                      <Badge variant={actionBadgeVariant(row.action)} className="font-mono">
                        {row.action}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                          {row.resourceType}
                        </span>
                        <span className="text-foreground font-mono text-xs">{row.target}</span>
                      </div>
                    </td>
                    <td className="text-muted-foreground text-xs">{row.summary}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </PanelBody>
      </Panel>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
    </div>
  );
}
