'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Package } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { useBuyer } from '@/features/buyer/buyer-context';
import { Link, useRouter } from '@/i18n/navigation';
import { apiUrl } from '@/lib/env';
import type { BuyerOrder } from '@/lib/services/orders';
import type { OrderStatus } from '@/lib/services/orders-schema';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<OrderStatus, string> = {
  submitted: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  confirmed: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  accepted: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  expired: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
};

export function OrdersListView() {
  const t = useTranslations('store');
  const router = useRouter();
  const { buyer, loading, formatMoney } = useBuyer();
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !buyer) {
      router.replace('/login');
    }
  }, [buyer, loading, router]);

  useEffect(() => {
    if (!buyer) return;
    let cancelled = false;

    void fetch(apiUrl('/api/buyer/orders?page=1&pageSize=100'), {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((raw) => {
        const payload = raw as { data?: { items?: BuyerOrder[] } } | null;
        if (!cancelled) {
          setOrders(payload?.data?.items ?? []);
        }
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [buyer]);

  const statusLabel = (status: OrderStatus): string => {
    switch (status) {
      case 'submitted':
        return t('st_submitted');
      case 'confirmed':
        return t('st_confirmed');
      case 'accepted':
        return t('st_accepted');
      case 'rejected':
        return t('st_rejected');
      case 'expired':
        return t('st_expired');
    }
  };

  if (loading || !buyer || fetching) {
    return (
      <div className="text-muted-foreground py-16 text-center text-sm">{t('acc_loading')}…</div>
    );
  }

  return (
    <div className="py-4">
      <div className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{t('ord_title')}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t('ord_lead')}</p>
      </div>

      {orders.length === 0 ? (
        <div className="border-border bg-card rounded-lg border p-10 text-center">
          <Package className="text-muted-foreground mx-auto size-10" />
          <h2 className="text-foreground mt-4 text-lg font-bold">{t('ord_empty_t')}</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">{t('ord_empty_d')}</p>
          <Link href="/catalogue" className={cn(buttonVariants({ size: 'default' }), 'mt-5')}>
            {t('cta_browse')}
          </Link>
        </div>
      ) : (
        <div className="border-border bg-card overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-border bg-background-2 text-muted-foreground border-b text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t('ord_col_ref')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('ord_col_date')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('ord_col_items')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('ord_total')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('ord_col_status')}</th>
                  <th className="px-4 py-3 text-end font-medium" />
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {orders.map((order) => {
                  const totalAmount = order.grandTotal ?? order.subtotal;
                  const formattedDate = new Date(order.submittedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr key={order.id} className="hover:bg-background-2/60 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-semibold">
                        <Link
                          href={`/orders/${encodeURIComponent(order.orderNumber)}`}
                          className="text-foreground hover:text-primary-ink"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="text-muted-foreground px-4 py-3.5">{formattedDate}</td>
                      <td className="text-foreground px-4 py-3.5 font-mono">
                        {order.items.length}
                      </td>
                      <td
                        dir="auto"
                        className="text-foreground px-4 py-3.5 font-mono font-semibold"
                      >
                        {formatMoney(totalAmount, order.currency)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                            STATUS_BADGE[order.status],
                          )}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-end">
                        <Link
                          href={`/orders/${encodeURIComponent(order.orderNumber)}`}
                          className="text-primary-ink inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                        >
                          {t('view_all')}
                          <ArrowRight className="size-3.5 rtl:rotate-180" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
