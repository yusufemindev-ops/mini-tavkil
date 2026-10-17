import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import type { OrderStatus } from '@/components/ui/status-badge';

export interface OrderItemOption {
  name: string;
  value: string;
}

export interface AdminOrderItem {
  id: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  unit: string;
  moq: number;
  quantity: number;
  unitPriceBase: number;
  unitPriceFinal: number | null;
  lineSubtotal: number | null;
  currency: string;
  options: OrderItemOption[];
  buyerNote: string | null;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  buyer: {
    id: string;
    name: string;
    company: string | null;
    tierMarkup: number;
  };
  tierMarkupAtSubmit: number;
  confirmedMarkupPercent: number | null;
  currency: string;
  submittedSubtotal: number;
  confirmedSubtotal: number | null;
  confirmedGrandTotal: number | null;
  items: AdminOrderItem[];
  notesBuyer: string | null;
  notesAdmin: string | null;
  rejectionReason: string | null;
  assignedUserId: string | null;
  submittedAt: string;
  confirmedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  expiredAt: string | null;
}

export interface AdminOrderPage {
  items: AdminOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ConfirmOrderPayload {
  markupPercent?: number;
  adminNote?: string | null;
  itemOverrides?: { itemId: string; unitPriceFinal: number }[];
}

export function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function priceNum(raw: string | undefined): number {
  return Number(raw) || 0;
}

export function defaultBuyerPrice(unitPriceBase: number, markupPct: number): number {
  return round2(unitPriceBase * (1 + markupPct / 100));
}

export function orderBuyerTotal(
  items: { id: string; quantity: number }[],
  buyerPrices: Record<string, string>,
): number {
  return round2(items.reduce((sum, i) => sum + priceNum(buyerPrices[i.id]) * i.quantity, 0));
}

export function markupAllPrices(
  items: { id: string; unitPriceBase: number }[],
  markupPct: number,
): Record<string, string> {
  return Object.fromEntries(
    items.map((i) => [i.id, String(defaultBuyerPrice(i.unitPriceBase, markupPct))]),
  );
}

export function buildConfirmPayload(
  items: { id: string }[],
  buyerPrices: Record<string, string>,
  markupPct: number,
  adminNote?: string | null,
): ConfirmOrderPayload {
  return {
    markupPercent: markupPct,
    ...(adminNote !== undefined ? { adminNote } : {}),
    itemOverrides: items.map((i) => ({
      itemId: i.id,
      unitPriceFinal: priceNum(buyerPrices[i.id]),
    })),
  };
}

export function buyerTotal(o: Pick<AdminOrder, 'confirmedSubtotal' | 'submittedSubtotal'>): number {
  return o.confirmedSubtotal ?? o.submittedSubtotal;
}

export function unitCount(o: { items: { quantity: number }[] }): number {
  return o.items.reduce((n, i) => n + i.quantity, 0);
}

export const ordersKeys = {
  all: ['orders'] as const,
  detail: (id: string) => ['orders', id] as const,
};

export function useOrders(enabled = true) {
  return useQuery({
    queryKey: ordersKeys.all,
    queryFn: () => api.get<AdminOrderPage>('/admin/orders?pageSize=100'),
    select: (page) => page.items,
    staleTime: 0,
    enabled,
  });
}

export function useOrder(id: string, enabled = true) {
  return useQuery({
    queryKey: ordersKeys.detail(id),
    queryFn: () => api.get<AdminOrder>(`/admin/orders/${id}`),
    enabled,
  });
}

export function confirmOrder(id: string, payload: ConfirmOrderPayload): Promise<AdminOrder> {
  return api.post<AdminOrder>(`/admin/orders/${id}/confirm`, payload);
}

export function rejectOrder(id: string, reason: string | null): Promise<AdminOrder> {
  return api.post<AdminOrder>(`/admin/orders/${id}/reject`, { reason });
}

export function assignOrder(id: string, assignedUserId: string | null): Promise<AdminOrder> {
  return api.patch<AdminOrder>(`/admin/orders/${id}/assign`, { assignedUserId });
}

export function useInvalidateOrders() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: ordersKeys.all });
    if (id) void qc.invalidateQueries({ queryKey: ordersKeys.detail(id) });
  };
}
