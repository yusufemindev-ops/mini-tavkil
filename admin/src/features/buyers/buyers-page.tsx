import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Download, Plus } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { getCountry, countryName } from '@repo/countries';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { FilterPills, type FilterPill } from '@/components/ui/filter-pills';
import { TableSkeleton } from '@/components/ui/skeleton';
import { OnlineStatus } from './online-status';
import { useBuyers, type Buyer, type BuyerStatus } from './queries';

type Filter = BuyerStatus | 'all';

const countryLabel = (code: string | null): string => {
  const c = code ? getCountry(code) : undefined;
  return c ? `${c.flag} ${countryName(c, 'en')}` : (code ?? '—');
};

function exportBuyersCsv(rows: Buyer[]) {
  const headers = [
    'Company',
    'Contact Name',
    'Email',
    'Phone',
    'Country',
    'City',
    'Tier Markup %',
    'Orders',
    'Status',
    'Verified',
    'Joined',
  ];
  const escape = (val: string | number | boolean | null | undefined) => {
    const s = String(val ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(','),
    ...rows.map((b) =>
      [
        b.company ?? '',
        b.contactName,
        b.email,
        b.phone ?? '',
        b.countryCode ?? '',
        b.city ?? '',
        b.tierMarkup,
        b.orders,
        b.status,
        b.verified ? 'yes' : 'no',
        b.createdAt,
      ]
        .map(escape)
        .join(','),
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tavkil-buyers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const buyerColumns: ColumnDef<Buyer>[] = [
  {
    id: 'buyer',
    accessorFn: (b) => `${b.company ?? ''} ${b.contactName}`,
    header: 'Buyer',
    enableSorting: false,
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.company ?? row.original.contactName}</div>
        <div className="text-muted-foreground text-[11.5px]">{row.original.contactName}</div>
      </div>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    enableSorting: false,
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
  },
  {
    id: 'country',
    accessorFn: (b) => b.countryCode,
    header: 'Country',
    enableColumnFilter: false,
    cell: ({ row }) => <span>{countryLabel(row.original.countryCode)}</span>,
  },
  {
    accessorKey: 'tierMarkup',
    header: 'Tier markup',
    enableColumnFilter: false,
    cell: ({ getValue }) => <Badge variant="primary">{getValue<number>()}%</Badge>,
  },
  { accessorKey: 'orders', header: 'Orders', enableColumnFilter: false },
  {
    accessorKey: 'status',
    header: 'Status',
    enableColumnFilter: false,
    cell: ({ getValue }) =>
      getValue<string>() === 'active' ? (
        <Badge variant="success">Active</Badge>
      ) : (
        <Badge variant="warning">Suspended</Badge>
      ),
  },
  {
    accessorKey: 'verified',
    header: 'Verified',
    enableColumnFilter: false,
    cell: ({ getValue }) =>
      getValue<boolean>() ? (
        <Badge variant="success">Verified</Badge>
      ) : (
        <Badge variant="secondary">Unverified</Badge>
      ),
  },
  {
    id: 'online',
    accessorFn: (b) => b.lastSeenAt,
    header: 'Activity',
    enableColumnFilter: false,
    sortingFn: (a, b) => {
      const at = a.original.lastSeenAt ? new Date(a.original.lastSeenAt).getTime() : 0;
      const bt = b.original.lastSeenAt ? new Date(b.original.lastSeenAt).getTime() : 0;
      return at - bt;
    },
    cell: ({ row }) => (
      <OnlineStatus
        lastSeenAt={row.original.lastSeenAt}
        hasActiveSession={row.original.hasActiveSession}
      />
    ),
  },
];

export function BuyersPage() {
  const navigate = useNavigate();
  const { data: buyers = [], isLoading } = useBuyers();
  const [filter, setFilter] = useState<Filter>('active');

  const counts = useMemo(() => {
    const active = buyers.filter((b) => b.status === 'active').length;
    const suspended = buyers.filter((b) => b.status === 'suspended').length;
    return { active, suspended, all: buyers.length };
  }, [buyers]);

  const filtered = useMemo(
    () => (filter === 'all' ? buyers : buyers.filter((b) => b.status === filter)),
    [buyers, filter],
  );

  const pills: FilterPill[] = [
    { value: 'active', label: 'Active', count: counts.active },
    { value: 'suspended', label: 'Suspended', count: counts.suspended },
    { value: 'all', label: 'All', count: counts.all },
  ];

  return (
    <div>
      <PageHeader
        title="Buyer accounts"
        subtitle={`${counts.active} active · ${counts.suspended} suspended · Tier markup applied per buyer`}
        actions={
          <>
            <Button
              variant="outline"
              disabled={filtered.length === 0}
              onClick={() => exportBuyersCsv(filtered)}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button onClick={() => navigate('/buyer-accounts/new')}>
              <Plus className="size-4" />
              New buyer
            </Button>
          </>
        }
      />

      <FilterPills pills={pills} value={filter} onChange={(v) => setFilter(v as Filter)} />

      {isLoading ? (
        <TableSkeleton
          bordered
          rows={10}
          columns={[
            { header: 'Buyer', cell: 'avatar' },
            { header: 'Email', cell: 'code' },
            { header: 'Country', cell: 'text' },
            { header: 'Tier markup', cell: 'badge' },
            { header: 'Orders', cell: 'number' },
            { header: 'Status', cell: 'badge' },
            { header: 'Verified', cell: 'badge' },
            { header: 'Activity', cell: 'text' },
          ]}
        />
      ) : (
        <DataTable
          columns={buyerColumns}
          data={filtered}
          onRowClick={(b) => navigate(`/buyer-accounts/${b.id}`)}
        />
      )}
    </div>
  );
}
