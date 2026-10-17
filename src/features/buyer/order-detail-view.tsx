'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, FileCheck2, XCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
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

export function OrderDetailView({ orderNumber }: Readonly<{ orderNumber: string }>) {
  const t = useTranslations('store');
  const router = useRouter();
  const { buyer, loading, formatMoney } = useBuyer();

  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [fetching, setFetching] = useState(true);
  const [notFoundErr, setNotFoundErr] = useState(false);

  const [acting, setActing] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !buyer) {
      router.replace('/login');
    }
  }, [buyer, loading, router]);

  useEffect(() => {
    if (!buyer) return;
    let cancelled = false;

    void fetch(apiUrl(`/api/buyer/orders/${encodeURIComponent(orderNumber)}`), {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          setNotFoundErr(true);
          setOrder(null);
          return;
        }
        if (res.ok) {
          const payload = (await res.json()) as { data?: BuyerOrder };
          setOrder(payload.data ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFoundErr(true);
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [buyer, orderNumber]);

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

  const decisionIcon = (status: OrderStatus) => {
    if (status === 'accepted') {
      return <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />;
    }
    if (status === 'rejected' || status === 'expired') {
      return <XCircle className="text-destructive size-5 shrink-0" />;
    }
    return <Clock className="text-muted-foreground size-5 shrink-0" />;
  };

  const decisionLabel = (status: OrderStatus): string => {
    if (status === 'accepted') return t('tl_accepted');
    if (status === 'rejected') return t('tl_rejected');
    if (status === 'expired') return t('tl_expired');
    return t('tl_decision');
  };

  const handleAccept = async () => {
    setActing(true);
    setActionError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/buyer/orders/${encodeURIComponent(orderNumber)}/accept`),
        {
          method: 'POST',
          credentials: 'include',
        },
      );
      if (!res.ok) {
        setActionError(t('ord_decide_error'));
        return;
      }
      const payload = (await res.json()) as { data?: BuyerOrder };
      if (payload.data) setOrder(payload.data);
    } catch {
      setActionError(t('ord_decide_error'));
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    setActing(true);
    setActionError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/buyer/orders/${encodeURIComponent(orderNumber)}/reject`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
        },
      );
      if (!res.ok) {
        setActionError(t('ord_decide_error'));
        return;
      }
      const payload = (await res.json()) as { data?: BuyerOrder };
      if (payload.data) {
        setOrder(payload.data);
        setShowRejectBox(false);
      }
    } catch {
      setActionError(t('ord_decide_error'));
    } finally {
      setActing(false);
    }
  };

  if (loading || !buyer || fetching) {
    return (
      <div className="text-muted-foreground py-16 text-center text-sm">{t('acc_loading')}…</div>
    );
  }

  if (notFoundErr || !order) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <div className="border-border bg-card rounded-lg border p-8 text-center">
          <AlertCircle className="text-muted-foreground mx-auto size-10" />
          <h1 className="text-foreground mt-4 text-xl font-bold">{t('ord_nf_t')}</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">{t('ord_nf_d')}</p>
          <Link href="/orders" className={cn(buttonVariants({ variant: 'outline' }), 'mt-5')}>
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {t('ord_back')}
          </Link>
        </div>
      </div>
    );
  }

  const totalAmount = order.grandTotal ?? order.subtotal;
  const priceAdjusted = Math.abs(order.subtotal - order.originalSubtotal) > 0.009;
  const submittedDate = new Date(order.submittedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/orders"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="size-3.5 rtl:rotate-180" />
            {t('ord_back')}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-foreground font-mono text-2xl font-bold tracking-tight sm:text-3xl">
              {order.orderNumber}
            </h1>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold',
                STATUS_BADGE[order.status],
              )}
            >
              {statusLabel(order.status)}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {t('ord_placed')} {submittedDate}
          </p>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="border-border bg-card grid gap-4 rounded-lg border p-5 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-primary size-5 shrink-0" />
          <div>
            <div className="text-foreground text-xs font-semibold">{t('tl_submitted')}</div>
            <div className="text-muted-foreground text-[11px]">{submittedDate}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {order.confirmedAt ? (
            <CheckCircle2 className="text-primary size-5 shrink-0" />
          ) : (
            <Clock className="text-muted-foreground size-5 shrink-0" />
          )}
          <div>
            <div className="text-foreground text-xs font-semibold">
              {order.confirmedAt ? t('tl_confirmed') : t('tl_review')}
            </div>
            {order.confirmedAt && (
              <div className="text-muted-foreground text-[11px]">
                {new Date(order.confirmedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {decisionIcon(order.status)}
          <div>
            <div className="text-foreground text-xs font-semibold">
              {decisionLabel(order.status)}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmed Quote Decision Banner */}
      {order.status === 'confirmed' && (
        <div className="border-primary/30 bg-primary/5 rounded-lg border p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck2 className="text-primary size-5" />
                <h2 className="text-foreground text-base font-bold">{t('ord_decide_t')}</h2>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">{t('ord_decide_d')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button type="button" onClick={handleAccept} disabled={acting}>
                {t('ord_accept')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRejectBox((v) => !v)}
                disabled={acting}
              >
                {t('ord_reject')}
              </Button>
            </div>
          </div>

          {actionError && (
            <p className="text-destructive mt-3 text-xs font-medium">{actionError}</p>
          )}

          {showRejectBox && (
            <div className="border-border bg-card mt-4 space-y-3 rounded-md border p-4">
              <p className="text-foreground text-xs font-semibold">{t('ord_reject_t')}</p>
              <p className="text-muted-foreground text-xs">{t('ord_reject_d')}</p>
              <textarea
                rows={2}
                placeholder={t('ord_reject_ph')}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2 text-xs focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRejectBox(false)}
                >
                  {t('ord_cancel')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleReject}
                  disabled={acting}
                >
                  {t('ord_reject')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {order.status === 'rejected' && (
        <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-4 text-sm">
          <p className="text-foreground font-semibold">{t('ord_rejected_seller')}</p>
          {order.rejectionReason && (
            <p className="text-muted-foreground mt-1 text-xs">
              <strong>{t('ord_reject_reason_l')}:</strong> {order.rejectionReason}
            </p>
          )}
        </div>
      )}

      {order.status === 'expired' && (
        <div className="border-border bg-background-2 text-muted-foreground rounded-lg border p-4 text-sm">
          {t('ord_expired_note')}
        </div>
      )}

      {priceAdjusted && (
        <div className="border-border bg-background-2 text-muted-foreground rounded-md border px-4 py-3 text-xs">
          {t('ord_adj_t')} ({t('ord_adj_was')}:{' '}
          <span className="font-mono">{formatMoney(order.originalSubtotal, order.currency)}</span>)
        </div>
      )}

      {/* Line Items Table */}
      <div className="border-border bg-card overflow-hidden rounded-lg border">
        <div className="divide-border divide-y">
          {order.items.map((item) => {
            const itemAdjusted = Math.abs(item.unitPrice - item.originalUnitPrice) > 0.009;
            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              >
                <div>
                  <div className="text-foreground font-semibold">{item.name}</div>
                  {item.options.length > 0 && (
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      {item.options.map((o) => `${o.name}: ${o.value}`).join(' · ')}
                    </div>
                  )}
                  <div className="text-muted-foreground mt-1 font-mono text-xs">
                    {item.quantity} {item.unit} ×{' '}
                    <span dir="auto" className="text-foreground font-medium">
                      {formatMoney(item.unitPrice, order.currency)}
                    </span>
                    {itemAdjusted && (
                      <span className="ms-1.5 line-through opacity-70">
                        {formatMoney(item.originalUnitPrice, order.currency)}
                      </span>
                    )}
                  </div>
                </div>

                <div dir="auto" className="text-foreground font-mono text-sm font-bold sm:text-end">
                  {formatMoney(item.lineSubtotal, order.currency)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-border bg-background-2 flex items-center justify-between border-t px-5 py-4">
          <span className="text-foreground text-sm font-semibold">{t('ord_total')}</span>
          <span dir="auto" className="text-foreground font-mono text-lg font-bold">
            {formatMoney(totalAmount, order.currency)}
          </span>
        </div>
      </div>

      {order.notes && (
        <div className="border-border bg-card rounded-lg border p-5">
          <div className="text-muted-foreground text-xs font-medium uppercase">
            {t('cart_notes_t')}
          </div>
          <p className="text-foreground mt-1.5 text-sm whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
