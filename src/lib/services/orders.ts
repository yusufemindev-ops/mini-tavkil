import { and, asc, count, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { authUser, buyerProfiles, orderRequestItems, orderRequests } from '@/lib/db/schema';
import { assertUuid, conflict, notFound } from '@/lib/api/errors';
import type {
  AssignOrderInput,
  ConfirmOrderInput,
  ListAdminOrdersQuery,
  OrderStatus,
  RejectOrderInput,
} from '@/lib/services/orders-schema';

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

const round2 = (n: number) => Math.round(n * 100) / 100;

function asUtcIso(value: string | null): string | null {
  if (!value) return null;
  const hasZone = /[Zz]$|[+-]\d{2}(:?\d{2})?$/.test(value);
  const normalized = hasZone ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function pickLocalized(map: Record<string, string>, locale: string): string {
  return map[locale] ?? map.en ?? Object.values(map)[0] ?? '';
}

function resolveProductName(raw: string, locale: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return pickLocalized(parsed as Record<string, string>, locale) || trimmed;
      }
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function parseOptions(raw: unknown, locale: string): OrderItemOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const o = (entry ?? {}) as {
      name?: Record<string, string> | string;
      value?: Record<string, string> | string;
    };
    const name = typeof o.name === 'string' ? o.name : o.name ? pickLocalized(o.name, locale) : '';
    const value =
      typeof o.value === 'string' ? o.value : o.value ? pickLocalized(o.value, locale) : '';
    return { name, value };
  });
}

type JoinedOrderRow = {
  order: typeof orderRequests.$inferSelect;
  buyerName: string | null;
  buyerFirstName: string | null;
  buyerLastName: string | null;
  buyerContactName: string | null;
  buyerCompany: string | null;
  tierMarkupPercent: string | null;
};

async function hydrateAdminOrders(rows: JoinedOrderRow[]): Promise<AdminOrder[]> {
  if (rows.length === 0) return [];
  const orderIds = rows.map((r) => r.order.id);

  const itemRows = await db
    .select()
    .from(orderRequestItems)
    .where(inArray(orderRequestItems.orderRequestId, orderIds))
    .orderBy(asc(orderRequestItems.sortOrder));

  const itemsByOrder = new Map<string, (typeof orderRequestItems.$inferSelect)[]>();
  for (const item of itemRows) {
    const list = itemsByOrder.get(item.orderRequestId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderRequestId, list);
  }

  return rows.map((row) => {
    const o = row.order;
    const rawItems = itemsByOrder.get(o.id) ?? [];
    const fullName = [row.buyerFirstName, row.buyerLastName].filter(Boolean).join(' ').trim();
    const buyerName = fullName || row.buyerContactName || row.buyerName || 'Buyer';

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status as OrderStatus,
      buyer: {
        id: o.buyerId,
        name: buyerName,
        company: row.buyerCompany ?? null,
        tierMarkup: row.tierMarkupPercent ? Number(row.tierMarkupPercent) : 0,
      },
      tierMarkupAtSubmit: Number(o.tierMarkupPercentAtSubmit),
      confirmedMarkupPercent:
        o.confirmedMarkupPercent !== null ? Number(o.confirmedMarkupPercent) : null,
      currency: (o.confirmedCurrency ?? o.submittedCurrency).trim(),
      submittedSubtotal: Number(o.submittedSubtotalAmount),
      confirmedSubtotal:
        o.confirmedSubtotalAmount !== null ? Number(o.confirmedSubtotalAmount) : null,
      confirmedGrandTotal:
        o.confirmedGrandTotalAmount !== null ? Number(o.confirmedGrandTotalAmount) : null,
      items: rawItems.map((it) => {
        return {
          id: it.id,
          productId: it.productId,
          name: resolveProductName(it.productNameSnapshot, o.locale),
          imageUrl: it.productImageUrlSnapshot ?? null,
          unit: it.productUnitSnapshot,
          moq: it.productMoqSnapshot,
          quantity: it.quantity,
          unitPriceBase: Number(it.unitPriceBase),
          unitPriceFinal: it.unitPriceFinal !== null ? Number(it.unitPriceFinal) : null,
          lineSubtotal: it.lineSubtotal !== null ? Number(it.lineSubtotal) : null,
          currency: it.currency.trim(),
          options: parseOptions(it.selectedOptions, o.locale),
          buyerNote: it.buyerNote ?? null,
        };
      }),
      notesBuyer: o.notesBuyer ?? null,
      notesAdmin: o.notesAdmin ?? null,
      rejectionReason: o.rejectionReason ?? null,
      assignedUserId: o.assignedUserId ?? null,
      submittedAt: asUtcIso(o.submittedAt) ?? o.submittedAt,
      confirmedAt: asUtcIso(o.confirmedAt),
      acceptedAt: asUtcIso(o.acceptedAt),
      rejectedAt: asUtcIso(o.rejectedAt),
      expiredAt: asUtcIso(o.expiredAt),
    };
  });
}

export async function listAdminOrders(query: ListAdminOrdersQuery): Promise<AdminOrderPage> {
  const { page, pageSize, status, buyerId, search } = query;
  const offset = (page - 1) * pageSize;

  const filters = [isNull(orderRequests.deletedAt)];
  if (status) {
    filters.push(eq(orderRequests.status, status));
  }
  if (buyerId) {
    filters.push(eq(orderRequests.buyerId, buyerId));
  }
  if (search) {
    const pattern = `%${search}%`;
    filters.push(
      or(
        ilike(orderRequests.orderNumber, pattern),
        ilike(authUser.name, pattern),
        ilike(authUser.companyName, pattern),
        ilike(authUser.email, pattern),
      )!,
    );
  }

  const whereClause = and(...filters);

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select({
        order: orderRequests,
        buyerName: authUser.name,
        buyerFirstName: authUser.firstName,
        buyerLastName: authUser.lastName,
        buyerContactName: authUser.contactName,
        buyerCompany: authUser.companyName,
        tierMarkupPercent: buyerProfiles.tierMarkupPercent,
      })
      .from(orderRequests)
      .innerJoin(authUser, eq(orderRequests.buyerId, authUser.id))
      .leftJoin(buyerProfiles, eq(buyerProfiles.authUserId, authUser.id))
      .where(whereClause)
      .orderBy(desc(orderRequests.submittedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ value: count() })
      .from(orderRequests)
      .innerJoin(authUser, eq(orderRequests.buyerId, authUser.id))
      .where(whereClause),
  ]);

  const items = await hydrateAdminOrders(rows);

  return {
    items,
    total: Number(total ?? 0),
    page,
    pageSize,
  };
}

export async function getAdminOrder(id: string): Promise<AdminOrder> {
  assertUuid(id, 'Order');
  const [row] = await db
    .select({
      order: orderRequests,
      buyerName: authUser.name,
      buyerFirstName: authUser.firstName,
      buyerLastName: authUser.lastName,
      buyerContactName: authUser.contactName,
      buyerCompany: authUser.companyName,
      tierMarkupPercent: buyerProfiles.tierMarkupPercent,
    })
    .from(orderRequests)
    .innerJoin(authUser, eq(orderRequests.buyerId, authUser.id))
    .leftJoin(buyerProfiles, eq(buyerProfiles.authUserId, authUser.id))
    .where(and(eq(orderRequests.id, id), isNull(orderRequests.deletedAt)))
    .limit(1);

  if (!row) throw notFound('Order not found.');
  const [hydrated] = await hydrateAdminOrders([row]);
  return hydrated!;
}

export async function confirmAdminOrder(
  id: string,
  input: ConfirmOrderInput,
  actorId: string,
): Promise<AdminOrder> {
  assertUuid(id, 'Order');
  const [order] = await db
    .select()
    .from(orderRequests)
    .where(and(eq(orderRequests.id, id), isNull(orderRequests.deletedAt)))
    .limit(1);

  if (!order) throw notFound('Order not found.');
  if (order.status !== 'submitted' && order.status !== 'confirmed') {
    throw conflict(`Cannot confirm an order in status "${order.status}".`);
  }

  const items = await db
    .select()
    .from(orderRequestItems)
    .where(eq(orderRequestItems.orderRequestId, id))
    .orderBy(asc(orderRequestItems.sortOrder));

  const markup = round2(
    input.markupPercent ?? Number(order.confirmedMarkupPercent ?? order.tierMarkupPercentAtSubmit),
  );
  const overrides = new Map((input.itemOverrides ?? []).map((o) => [o.itemId, o.unitPriceFinal]));
  const now = new Date().toISOString();

  let subtotal = 0;
  const itemUpdates = items.map((it) => {
    const override = overrides.get(it.id);
    const unitPriceFinal =
      override !== undefined
        ? round2(override)
        : round2(Number(it.unitPriceBase) * (1 + markup / 100));
    const lineSubtotal = round2(unitPriceFinal * it.quantity);
    subtotal = round2(subtotal + lineSubtotal);

    return db
      .update(orderRequestItems)
      .set({
        unitPriceFinal: String(unitPriceFinal),
        lineSubtotal: String(lineSubtotal),
        updatedAt: now,
      })
      .where(eq(orderRequestItems.id, it.id));
  });

  const orderUpdate = db
    .update(orderRequests)
    .set({
      status: 'confirmed',
      confirmedMarkupPercent: String(markup),
      confirmedSubtotalAmount: String(subtotal),
      confirmedGrandTotalAmount: String(subtotal),
      confirmedCurrency: order.submittedCurrency.trim(),
      confirmedAt: now,
      confirmedByUserId: actorId,
      ...(input.adminNote !== undefined ? { notesAdmin: input.adminNote } : {}),
      updatedAt: now,
    })
    .where(eq(orderRequests.id, id));

  await db.batch([orderUpdate, ...itemUpdates]);

  return getAdminOrder(id);
}

export async function rejectAdminOrder(id: string, input: RejectOrderInput): Promise<AdminOrder> {
  assertUuid(id, 'Order');
  const [order] = await db
    .select()
    .from(orderRequests)
    .where(and(eq(orderRequests.id, id), isNull(orderRequests.deletedAt)))
    .limit(1);

  if (!order) throw notFound('Order not found.');
  if (order.status !== 'submitted' && order.status !== 'confirmed') {
    throw conflict(`Cannot reject an order in status "${order.status}".`);
  }

  const now = new Date().toISOString();
  await db
    .update(orderRequests)
    .set({
      status: 'rejected',
      rejectionReason: input.reason?.trim() || null,
      rejectedAt: now,
      updatedAt: now,
    })
    .where(eq(orderRequests.id, id));

  return getAdminOrder(id);
}

export async function assignAdminOrder(id: string, input: AssignOrderInput): Promise<AdminOrder> {
  assertUuid(id, 'Order');
  const [order] = await db
    .select({ id: orderRequests.id })
    .from(orderRequests)
    .where(and(eq(orderRequests.id, id), isNull(orderRequests.deletedAt)))
    .limit(1);

  if (!order) throw notFound('Order not found.');

  await db
    .update(orderRequests)
    .set({
      assignedUserId: input.assignedUserId ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(orderRequests.id, id));

  return getAdminOrder(id);
}
