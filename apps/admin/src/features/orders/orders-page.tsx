import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { format, formatDistanceToNow } from 'date-fns';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge, type OrderStatus } from '@/components/ui/status-badge';
import { FilterPills } from '@/components/ui/filter-pills';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/skeleton';
import { buyerTotal, money, unitCount, useOrders } from './queries';

const STATUS_FILTERS: { value: OrderStatus; label: string }[] = [
  { value: 'submitted', label: 'To confirm' },
  { value: 'confirmed', label: 'Awaiting buyer' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

export function OrdersPage() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useOrders();
  const [status, setStatus] = useState<OrderStatus>('submitted');

  const pills = useMemo(
    () =>
      STATUS_FILTERS.map((f) => ({
        value: f.value,
        label: f.label,
        count: orders.filter((o) => o.status === f.value).length,
      })),
    [orders],
  );

  const rows = useMemo(() => orders.filter((o) => o.status === status), [orders, status]);
  const awaitingConfirm = orders.filter((o) => o.status === 'submitted').length;
  const awaitingBuyer = orders.filter((o) => o.status === 'confirmed').length;

  return (
    <div>
      <PageHeader
        title="Orders inbox"
        subtitle={`${awaitingConfirm} awaiting confirmation · ${awaitingBuyer} awaiting buyer accept`}
      />

      <FilterPills pills={pills} value={status} onChange={(v) => setStatus(v as OrderStatus)} />

      <Panel>
        {isLoading ? (
          <TableSkeleton
            rows={10}
            columns={[
              { header: 'Order #', cell: 'code' },
              { header: 'Buyer', cell: 'text' },
              { header: 'Items', cell: 'number' },
              { header: 'Buyer total', cell: 'number' },
              { header: 'Status', cell: 'badge' },
              { header: 'Submitted', cell: 'text' },
            ]}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-6" />}
            title="No orders here"
            description="No orders match this filter. Try another status."
            action={
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Back to dashboard
              </Button>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Buyer</th>
                <th>Items</th>
                <th>Buyer total</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <td>
                    <strong className="font-mono text-[12.5px]">{order.orderNumber}</strong>
                  </td>
                  <td>
                    <div className="font-medium">{order.buyer.company ?? order.buyer.name}</div>
                    <div className="text-muted-foreground text-[11.5px]">
                      {order.buyer.name} · Tier {order.tierMarkupAtSubmit}%
                    </div>
                  </td>
                  <td>
                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'} ·{' '}
                    {unitCount(order)} units
                  </td>
                  <td>
                    <strong>{money(buyerTotal(order), order.currency)}</strong>
                  </td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>
                    <SubmittedCell
                      iso={order.submittedAt}
                      pending={order.status === 'submitted' || order.status === 'confirmed'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}

function SubmittedCell({ iso, pending }: { iso: string; pending: boolean }) {
  const d = new Date(iso);
  const distance = formatDistanceToNow(d);
  const stale = pending && /\b(day|days|month|months|year|years)\b/.test(distance);
  return (
    <>
      <div className="text-foreground text-[12.5px]">{format(d, 'd MMM yyyy, HH:mm')}</div>
      <div className={cn('text-[11px]', stale ? 'text-amber-600' : 'text-muted-foreground')}>
        {pending ? `waiting ${distance}` : `${distance} ago`}
      </div>
    </>
  );
}
