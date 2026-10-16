import { describe, expect, it } from 'vitest';
import { buyerPresence, ONLINE_MS } from './presence';
import {
  buildConfirmPayload,
  buyerTotal,
  defaultBuyerPrice,
  markupAllPrices,
  orderBuyerTotal,
  unitCount,
} from '@/features/orders/queries';

describe('buyerPresence', () => {
  const now = 1_700_000_000_000;

  it('returns never when lastSeenAt is null', () => {
    expect(buyerPresence(null, true, now)).toBe('never');
    expect(buyerPresence(null, false, now)).toBe('never');
  });

  it('returns online only when hasActiveSession is true and heartbeat is recent', () => {
    const recentIso = new Date(now - 30_000).toISOString();
    expect(buyerPresence(recentIso, true, now)).toBe('online');
    expect(buyerPresence(recentIso, false, now)).toBe('offline');
  });

  it('returns offline when lastSeenAt is older than ONLINE_MS', () => {
    const staleIso = new Date(now - ONLINE_MS - 1_000).toISOString();
    expect(buyerPresence(staleIso, true, now)).toBe('offline');
  });
});

describe('orders pricing helpers', () => {
  it('computes defaultBuyerPrice with 2-decimal rounding', () => {
    expect(defaultBuyerPrice(100, 15)).toBe(115);
    expect(defaultBuyerPrice(19.99, 12.5)).toBe(22.49);
  });

  it('computes markupAllPrices, orderBuyerTotal, and buildConfirmPayload', () => {
    const items = [
      { id: 'item-1', unitPriceBase: 100, quantity: 3 },
      { id: 'item-2', unitPriceBase: 50, quantity: 2 },
    ];
    const prices = markupAllPrices(items, 10);
    expect(prices).toEqual({ 'item-1': '110', 'item-2': '55' });
    expect(orderBuyerTotal(items, prices)).toBe(440);

    const payload = buildConfirmPayload(items, { ...prices, 'item-2': '52.5' }, 10, 'Custom quote');
    expect(payload).toEqual({
      markupPercent: 10,
      adminNote: 'Custom quote',
      itemOverrides: [
        { itemId: 'item-1', unitPriceFinal: 110 },
        { itemId: 'item-2', unitPriceFinal: 52.5 },
      ],
    });
  });

  it('computes buyerTotal and unitCount for inbox rows', () => {
    expect(buyerTotal({ submittedSubtotal: 500, confirmedSubtotal: null })).toBe(500);
    expect(buyerTotal({ submittedSubtotal: 500, confirmedSubtotal: 475 })).toBe(475);
    expect(unitCount({ items: [{ quantity: 4 }, { quantity: 6 }] })).toBe(10);
  });
});
