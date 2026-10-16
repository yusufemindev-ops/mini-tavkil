'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Clock, Lock, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useBuyer } from '@/features/buyer/buyer-context';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface VariantRate {
  id: string;
  sku: string | null;
  moq: number;
  packSize: number | null;
  isDefault: boolean;
  unitPrice: number | null;
  currency: string;
  options: Record<string, string>;
}

interface ProductBuyerPricingResponse {
  productId: string;
  sku: string | null;
  moq: number;
  unit: string;
  packSize: number | null;
  boxQuantity: number | null;
  unitPrice: number | null;
  currency: string;
  pendingVerification: boolean;
  imageUrl: string | null;
  variants: VariantRate[];
}

export function ProductBuyerBox({
  slug,
  name,
  moq,
  unit,
  packSize,
}: Readonly<{
  slug: string;
  name: string;
  moq: number;
  unit: string;
  packSize: number | null;
}>) {
  const t = useTranslations('store');
  const { buyer, loading: authLoading, formatMoney, cart } = useBuyer();
  const [pricing, setPricing] = useState<ProductBuyerPricingResponse | null>(null);
  const [fetching, setFetching] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(Math.max(1, moq));
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!buyer) return;

    let cancelled = false;
    void fetch(`/api/buyer/products/${encodeURIComponent(slug)}`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((raw) => {
        const payload = raw as { data?: ProductBuyerPricingResponse } | null;
        if (cancelled || !payload?.data) return;
        setPricing(payload.data);
        const def =
          payload.data.variants.find((v) => v.isDefault) ?? payload.data.variants[0] ?? null;
        if (def) {
          setSelectedVariantId(def.id);
          setQuantity(Math.max(1, def.moq || payload.data.moq));
        } else {
          setQuantity(Math.max(1, payload.data.moq));
        }
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [buyer, slug]);

  if (authLoading) {
    return null;
  }

  if (!buyer) {
    return (
      <div className="border-border bg-background-2 mb-5 rounded-md border p-4">
        <div className="flex items-start gap-3">
          <Lock className="text-foreground-soft mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-semibold">{t('pd_price_lock_t')}</p>
            <p className="text-foreground-soft mt-0.5 text-xs leading-relaxed">
              {t('pd_price_lock_d')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/login" className={cn(buttonVariants({ size: 'sm' }))}>
                {t('signin')}
              </Link>
              <Link
                href="/request"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                {t('request')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!buyer.verified || pricing?.pendingVerification) {
    return (
      <div className="border-border bg-background-2 mb-5 rounded-md border p-4">
        <div className="flex items-start gap-3">
          <Clock className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="text-foreground text-sm font-semibold">{t('pd_pending_t')}</p>
            <p className="text-foreground-soft mt-0.5 text-xs leading-relaxed">
              {t('pd_pending_d')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (fetching && !pricing) {
    return (
      <div className="border-border bg-background-2 text-foreground-soft mb-5 rounded-md border p-4 text-xs">
        {t('acc_loading')}…
      </div>
    );
  }

  const activeVariant =
    pricing?.variants.find((v) => v.id === selectedVariantId) ?? pricing?.variants[0] ?? null;
  const activeRate = activeVariant?.unitPrice ?? pricing?.unitPrice ?? null;
  const activeCurrency = activeVariant?.currency ?? pricing?.currency ?? 'USD';
  const activeMoq = activeVariant?.moq ?? pricing?.moq ?? moq;
  const activeSku = activeVariant?.sku ?? pricing?.sku ?? null;

  if (activeRate === null || !activeSku) {
    return null;
  }

  const handleAddToRequest = () => {
    const options = activeVariant
      ? Object.entries(activeVariant.options).map(([optName, optVal]) => ({
          name: optName,
          value: optVal,
        }))
      : [];

    cart.addItem({
      sku: activeSku,
      slug,
      name,
      imageUrl: pricing?.imageUrl ?? null,
      unit: pricing?.unit ?? unit,
      moq: activeMoq,
      packSize: activeVariant?.packSize ?? pricing?.packSize ?? packSize,
      quantity: Math.max(activeMoq, quantity),
      unitPrice: activeRate,
      currency: activeCurrency,
      options,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="border-primary/25 bg-primary/5 mb-5 rounded-md border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-foreground-soft text-xs font-medium tracking-wide uppercase">
          {t('pd_your_price')}
        </span>
        <div dir="auto" className="text-foreground font-mono text-2xl font-bold">
          {formatMoney(activeRate, activeCurrency)}
          <span className="text-foreground-soft ms-1 font-sans text-xs font-normal">
            / {pricing?.unit ?? unit}
          </span>
        </div>
      </div>

      <p className="text-foreground-soft mt-1.5 text-xs leading-relaxed">{t('price_indicative')}</p>

      {pricing && pricing.variants.length > 1 && (
        <div className="mt-3">
          <div className="text-foreground mb-1.5 block text-xs font-medium">{t('pd_options')}</div>
          <div className="flex flex-wrap gap-1.5">
            {pricing.variants.map((v) => {
              const label = Object.values(v.options).join(' · ') || v.sku || v.id.slice(0, 6);
              const isSelected = v.id === activeVariant?.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setSelectedVariantId(v.id);
                    setQuantity((q) => Math.max(v.moq || activeMoq, q));
                  }}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:bg-background-2',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div className="border-border bg-background inline-flex h-10 items-center rounded-md border">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => Math.max(activeMoq, q - 1))}
            disabled={quantity <= activeMoq}
            className="text-foreground hover:bg-background-2 flex h-full w-9 items-center justify-center disabled:opacity-40"
          >
            <Minus className="size-3.5" />
          </button>
          <input
            type="number"
            min={activeMoq}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(activeMoq, Math.floor(Number(e.target.value)) || activeMoq))
            }
            className="text-foreground h-full w-16 bg-transparent text-center font-mono text-sm font-medium focus:outline-none"
          />
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => q + 1)}
            className="text-foreground hover:bg-background-2 flex h-full w-9 items-center justify-center"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <Button type="button" onClick={handleAddToRequest} className="h-10 flex-1 gap-1.5">
          {added ? (
            <>
              <Check className="size-4" />
              {t('pd_added')}
            </>
          ) : (
            <>
              <ShoppingBag className="size-4" />
              {t('pd_add')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
