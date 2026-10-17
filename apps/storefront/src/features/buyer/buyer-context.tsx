'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { signOut } from '@/lib/auth-client';
import type { BuyerProfilePublic } from '@/lib/buyer-guard';
import { apiUrl } from '@/lib/env';

export interface PublicCurrency {
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  rateToUsd: number;
}

export interface CartItemOption {
  name: string;
  value: string;
}

export interface BuyerCartItem {
  key: string;
  sku: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  unit: string;
  moq: number;
  packSize: number | null;
  quantity: number;
  unitPrice: number;
  currency: string;
  options: CartItemOption[];
}

interface BuyerContextValue {
  buyer: BuyerProfilePublic | null;
  loading: boolean;
  refreshBuyer: () => Promise<void>;
  signOutBuyer: () => Promise<void>;
  currencies: PublicCurrency[];
  currency: string;
  setCurrency: (code: string) => void;
  convertAmount: (amount: number, fromCurrency?: string) => number;
  formatMoney: (amount: number, fromCurrency?: string) => string;
  cart: {
    items: BuyerCartItem[];
    addItem: (item: Omit<BuyerCartItem, 'key'>) => void;
    updateQuantity: (key: string, quantity: number) => void;
    removeItem: (key: string) => void;
    clearCart: () => void;
    totalItems: number;
    totalQuantity: number;
  };
}

const CURRENCY_STORAGE_KEY = 'tavkil.currency';
const CART_STORAGE_KEY = 'tavkil.buyer.cart';

const DEFAULT_CURRENCIES: PublicCurrency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', isBase: true, rateToUsd: 1 },
];

const BuyerContext = createContext<BuyerContextValue | null>(null);

function makeCartKey(sku: string, options: CartItemOption[]): string {
  const optKey = options
    .map((o) => `${o.name}:${o.value}`)
    .sort()
    .join('|');
  return `${sku}::${optKey}`;
}

export function BuyerProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [buyer, setBuyer] = useState<BuyerProfilePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [currencies, setCurrencies] = useState<PublicCurrency[]>(DEFAULT_CURRENCIES);
  const [currency, setCurrencyState] = useState<string>(() => {
    if (globalThis.window === undefined) return 'USD';
    try {
      return globalThis.window.localStorage.getItem(CURRENCY_STORAGE_KEY) || 'USD';
    } catch {
      return 'USD';
    }
  });
  const [cartItems, setCartItems] = useState<BuyerCartItem[]>(() => {
    if (globalThis.window === undefined) return [];
    try {
      const saved = globalThis.window.localStorage.getItem(CART_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as unknown;
      return Array.isArray(parsed) ? (parsed as BuyerCartItem[]) : [];
    } catch {
      return [];
    }
  });

  const refreshBuyer = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/buyer/me'), {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) {
        setBuyer(null);
        return;
      }
      const payload = (await res.json()) as { data?: BuyerProfilePublic | null };
      setBuyer(payload.data ?? null);
    } catch {
      setBuyer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(apiUrl('/api/buyer/me'), {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((raw) => {
        if (cancelled) return;
        const payload = raw as { data?: BuyerProfilePublic | null } | null;
        setBuyer(payload?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setBuyer(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    void fetch(apiUrl('/api/currencies'))
      .then((res) => (res.ok ? res.json() : null))
      .then((raw) => {
        if (cancelled) return;
        const payload = raw as { data?: PublicCurrency[] } | null;
        if (payload?.data && payload.data.length > 0) {
          setCurrencies(payload.data);
        }
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((code: string) => {
    const normalized = code.trim().toUpperCase();
    setCurrencyState(normalized);
    try {
      globalThis.window.localStorage.setItem(CURRENCY_STORAGE_KEY, normalized);
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const persistCart = useCallback((updater: (prev: BuyerCartItem[]) => BuyerCartItem[]) => {
    setCartItems((prev) => {
      const next = updater(prev);
      try {
        globalThis.window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors.
      }
      return next;
    });
  }, []);

  const addItem = useCallback(
    (incoming: Omit<BuyerCartItem, 'key'>) => {
      const key = makeCartKey(incoming.sku, incoming.options);
      persistCart((prev) => {
        const idx = prev.findIndex((i) => i.key === key);
        if (idx >= 0) {
          const updated = [...prev];
          const existing = updated[idx]!;
          updated[idx] = {
            ...existing,
            quantity: Math.max(incoming.moq, existing.quantity + incoming.quantity),
            unitPrice: incoming.unitPrice,
          };
          return updated;
        }
        return [
          ...prev,
          {
            ...incoming,
            key,
            quantity: Math.max(incoming.moq, incoming.quantity),
          },
        ];
      });
    },
    [persistCart],
  );

  const updateQuantity = useCallback(
    (key: string, quantity: number) => {
      persistCart((prev) =>
        prev.map((item) =>
          item.key === key
            ? { ...item, quantity: Math.max(item.moq, Math.floor(quantity) || item.moq) }
            : item,
        ),
      );
    },
    [persistCart],
  );

  const removeItem = useCallback(
    (key: string) => {
      persistCart((prev) => prev.filter((item) => item.key !== key));
    },
    [persistCart],
  );

  const clearCart = useCallback(() => {
    persistCart(() => []);
  }, [persistCart]);

  const signOutBuyer = useCallback(async () => {
    await signOut().catch(() => null);
    setBuyer(null);
  }, []);

  const convertAmount = useCallback(
    (amount: number, fromCurrency = 'USD'): number => {
      const fromCode = fromCurrency.trim().toUpperCase();
      const targetCode = currency.trim().toUpperCase();
      if (fromCode === targetCode) return amount;

      const fromRate = currencies.find((c) => c.code === fromCode)?.rateToUsd ?? 1;
      const targetRate = currencies.find((c) => c.code === targetCode)?.rateToUsd ?? 1;
      const inUsd = fromCode === 'USD' ? amount : amount / (fromRate || 1);
      const converted = targetCode === 'USD' ? inUsd : inUsd * (targetRate || 1);
      return Math.round((converted + Number.EPSILON) * 100) / 100;
    },
    [currencies, currency],
  );

  const formatMoney = useCallback(
    (amount: number, fromCurrency = 'USD'): string => {
      const targetCode = currency.trim().toUpperCase();
      const converted = convertAmount(amount, fromCurrency);
      const targetMeta = currencies.find((c) => c.code === targetCode);
      const symbol = targetMeta?.symbol || targetCode;
      return `${symbol}${converted.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${targetCode}`;
    },
    [convertAmount, currencies, currency],
  );

  const value = useMemo<BuyerContextValue>(
    () => ({
      buyer,
      loading,
      refreshBuyer,
      signOutBuyer,
      currencies,
      currency,
      setCurrency,
      convertAmount,
      formatMoney,
      cart: {
        items: cartItems,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalItems: cartItems.length,
        totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      },
    }),
    [
      addItem,
      buyer,
      cartItems,
      clearCart,
      convertAmount,
      currencies,
      currency,
      formatMoney,
      loading,
      refreshBuyer,
      removeItem,
      setCurrency,
      signOutBuyer,
      updateQuantity,
    ],
  );

  return <BuyerContext.Provider value={value}>{children}</BuyerContext.Provider>;
}

export function useBuyer(): BuyerContextValue {
  const ctx = useContext(BuyerContext);
  if (!ctx) {
    throw new Error('useBuyer must be used within a BuyerProvider');
  }
  return ctx;
}
