'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useBuyer } from '@/features/buyer/buyer-context';
import { Link, useRouter } from '@/i18n/navigation';
import { apiUrl } from '@/lib/env';
import { cn } from '@/lib/utils';

export function CartView() {
  const t = useTranslations('store');
  const locale = useLocale();
  const router = useRouter();
  const { buyer, loading, cart, convertAmount, formatMoney } = useBuyer();

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !buyer) {
      router.replace('/login');
    }
  }, [buyer, loading, router]);

  if (loading || !buyer) {
    return (
      <div className="text-muted-foreground py-16 text-center text-sm">{t('acc_loading')}…</div>
    );
  }

  if (submittedRef) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <div className="border-border bg-card rounded-lg border p-6 text-center sm:p-10">
          <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full">
            <CheckCircle2 className="size-6" />
          </div>
          <h1 className="text-foreground mt-4 text-2xl font-bold tracking-tight">
            {t('cart_done_t')}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t('cart_done_d')}</p>
          <div className="border-border bg-background-2 mt-5 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm">
            <span className="text-muted-foreground">{t('cart_ref')}:</span>
            <strong className="text-foreground font-mono">{submittedRef}</strong>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`/orders/${encodeURIComponent(submittedRef)}`}
              className={cn(buttonVariants({ size: 'default' }))}
            >
              {t('nav_orders')}
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
            <Link href="/catalogue" className={cn(buttonVariants({ variant: 'outline' }))}>
              {t('cta_browse')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <div className="border-border bg-card rounded-lg border p-8 text-center">
          <ShoppingBag className="text-muted-foreground mx-auto size-10" />
          <h1 className="text-foreground mt-4 text-xl font-bold">{t('cart_empty_t')}</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">{t('cart_empty_d')}</p>
          <Link href="/catalogue" className={cn(buttonVariants({ size: 'default' }), 'mt-5')}>
            {t('cta_browse')}
          </Link>
        </div>
      </div>
    );
  }

  const estimatedSubtotal = cart.items.reduce(
    (sum, item) => sum + convertAmount(item.unitPrice * item.quantity, item.currency),
    0,
  );

  const handleSubmitOrder = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(apiUrl('/api/buyer/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: cart.items.map((item) => ({
            sku: item.sku,
            quantity: item.quantity,
            options: item.options,
          })),
          notes: notes.trim() || undefined,
          locale: locale === 'tr' || locale === 'ar' ? locale : 'en',
        }),
      });

      const payload = (await res.json().catch(() => null)) as {
        data?: { orderNumber?: string };
        error?: { message?: string };
      } | null;

      if (!res.ok || !payload?.data?.orderNumber) {
        setSubmitError(payload?.error?.message || t('cart_submit_error'));
        return;
      }

      const ref = payload.data.orderNumber;
      cart.clearCart();
      setSubmittedRef(ref);
    } catch {
      setSubmitError(t('cart_submit_error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-4">
      <div className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{t('cart_title')}</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
          {t('cart_lead')}
        </p>
      </div>

      {submitError && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mb-6 flex items-start gap-2.5 rounded-md border p-4 text-xs">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="space-y-4">
          <div className="border-border bg-card divide-border divide-y rounded-lg border">
            {cart.items.map((item) => {
              const lineTotal = item.unitPrice * item.quantity;
              return (
                <div
                  key={item.key}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${item.slug}`}
                      className="text-foreground hover:text-primary-ink text-base font-semibold transition-colors"
                    >
                      {item.name}
                    </Link>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 font-mono text-xs">
                      <span>{item.sku}</span>
                      <span>·</span>
                      <span>
                        {t('moq')}: {item.moq} {item.unit}
                      </span>
                      {item.options.length > 0 && (
                        <>
                          <span>·</span>
                          <span>{item.options.map((o) => `${o.name}: ${o.value}`).join(', ')}</span>
                        </>
                      )}
                    </div>
                    <div dir="auto" className="text-muted-foreground mt-1.5 font-mono text-xs">
                      {formatMoney(item.unitPrice, item.currency)} / {item.unit}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="border-border bg-background inline-flex h-9 items-center rounded-md border">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={item.quantity <= item.moq}
                        onClick={() => cart.updateQuantity(item.key, item.quantity - 1)}
                        className="text-foreground hover:bg-background-2 flex h-full w-8 items-center justify-center disabled:opacity-40"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        type="number"
                        min={item.moq}
                        value={item.quantity}
                        onChange={(e) =>
                          cart.updateQuantity(item.key, Number(e.target.value) || item.moq)
                        }
                        className="text-foreground h-full w-14 bg-transparent text-center font-mono text-xs font-semibold focus:outline-none"
                      />
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => cart.updateQuantity(item.key, item.quantity + 1)}
                        className="text-foreground hover:bg-background-2 flex h-full w-8 items-center justify-center"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>

                    <div
                      dir="auto"
                      className="text-foreground min-w-[6.5rem] text-end font-mono text-sm font-semibold"
                    >
                      {formatMoney(lineTotal, item.currency)}
                    </div>

                    <button
                      type="button"
                      aria-label="Remove item"
                      onClick={() => cart.removeItem(item.key)}
                      className="text-muted-foreground hover:text-destructive rounded-md p-1.5 transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-border bg-card rounded-lg border p-5">
            <label htmlFor="cart-notes" className="text-foreground block text-sm font-medium">
              {t('cart_notes_t')}
            </label>
            <textarea
              id="cart-notes"
              rows={3}
              placeholder={t('cart_notes_ph')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              className="border-border bg-background text-foreground mt-2 w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>

        <aside className="border-border bg-card rounded-lg border p-6">
          <h2 className="text-foreground text-lg font-semibold">{t('cart_summary')}</h2>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t('cart_items')}</dt>
              <dd className="text-foreground font-mono font-medium">{cart.totalItems}</dd>
            </div>
            <div className="border-border flex items-baseline justify-between border-t pt-3">
              <dt className="text-foreground font-medium">{t('cart_subtotal')}</dt>
              <dd dir="auto" className="text-foreground font-mono text-lg font-bold">
                {formatMoney(estimatedSubtotal)}
              </dd>
            </div>
          </dl>

          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{t('cart_note')}</p>

          <Button
            type="button"
            size="lg"
            onClick={handleSubmitOrder}
            disabled={submitting || !buyer.verified}
            className="mt-5 w-full"
          >
            {submitting ? t('cart_submitting') : t('cart_submit')}
          </Button>
        </aside>
      </div>
    </div>
  );
}
