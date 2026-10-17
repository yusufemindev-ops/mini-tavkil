import { and, asc, count, desc, eq, ilike, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  auditLog,
  authUser,
  buyerProfiles,
  orderNumberSequence,
  orderRequestItems,
  orderRequests,
  productImages,
  products,
  productTranslations,
  productVariants,
  systemSettings,
} from '@/lib/db/schema';
import { assertUuid, conflict, forbidden, invalid, notFound } from '@/lib/api/errors';
import { resolveImageUrl } from '@/lib/media/image-url';
import { recordAudit } from '@/lib/services/audit-log';
import { notifyOrderConfirmed, notifyOrderSubmitted } from '@/lib/services/notifications';
import type {
  AssignOrderInput,
  ConfirmOrderInput,
  ListAdminOrdersQuery,
  ListBuyerOrdersQuery,
  OrderStatus,
  RejectOrderInput,
  SubmitBuyerOrderInput,
} from '@/lib/services/orders-schema';

export interface OrderItemOption {
  name: string;
  value: string;
}

export interface BuyerOrderItem {
  id: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  unit: string;
  moq: number;
  quantity: number;
  unitPrice: number;
  originalUnitPrice: number;
  lineSubtotal: number;
  options: OrderItemOption[];
  buyerNote: string | null;
}

export interface BuyerOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  originalSubtotal: number;
  grandTotal: number | null;
  items: BuyerOrderItem[];
  notes: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  confirmedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  expiredAt: string | null;
}

export interface BuyerOrderPage {
  items: BuyerOrder[];
  total: number;
  page: number;
  pageSize: number;
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

  const confirmedOrder = await getAdminOrder(id);
  const [buyerRow] = await db
    .select({ email: authUser.email, contactName: authUser.contactName, name: authUser.name })
    .from(authUser)
    .where(eq(authUser.id, order.buyerId))
    .limit(1);

  if (buyerRow) {
    void notifyOrderConfirmed({
      to: buyerRow.email,
      contactName: buyerRow.contactName ?? buyerRow.name,
      orderNumber: confirmedOrder.orderNumber,
      confirmedTotalAmount: confirmedOrder.confirmedGrandTotal ?? confirmedOrder.submittedSubtotal,
      currency: confirmedOrder.currency,
    });
  }

  return confirmedOrder;
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

async function resolveOrderExpiryCutoffMs(
  dbClient: typeof db = db,
  defaultDays = 30,
): Promise<number> {
  const [setting] = await dbClient
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(eq(systemSettings.key, 'order.auto_expire_days'))
    .limit(1);

  const rawDays = (setting?.value as { days?: unknown } | null)?.days;
  const days = typeof rawDays === 'number' && rawDays > 0 ? rawDays : defaultDays;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

/**
 * Transitions stale `submitted` or `confirmed` orders older than `order.auto_expire_days`
 * (default 30 days) to `expired`. Safe to run repeatedly in Cloudflare Cron Triggers.
 */
export async function expireStaleOrders(
  dbClient: typeof db = db,
  defaultDays = 30,
): Promise<number> {
  const cutoffIso = new Date(await resolveOrderExpiryCutoffMs(dbClient, defaultDays)).toISOString();
  const nowIso = new Date().toISOString();

  const expired = await dbClient
    .update(orderRequests)
    .set({
      status: 'expired',
      expiredAt: nowIso,
      updatedAt: nowIso,
    })
    .where(
      and(
        inArray(orderRequests.status, ['submitted', 'confirmed']),
        lt(orderRequests.submittedAt, cutoffIso),
        isNull(orderRequests.deletedAt),
      ),
    )
    .returning({ id: orderRequests.id, orderNumber: orderRequests.orderNumber });

  if (expired.length > 0) {
    try {
      await dbClient.insert(auditLog).values(
        expired.map((row) => ({
          actorType: 'system' as const,
          actorId: null,
          authMethod: 'system' as const,
          action: 'order.expired',
          resourceType: 'order',
          resourceId: row.id,
          beforeState: null,
          afterState: {
            status: 'expired',
            target: row.orderNumber,
            summary: `Auto-expired stale order ${row.orderNumber}`,
          },
        })),
      );
    } catch (error) {
      console.error('Failed to record order.expired audit logs:', error);
    }
  }

  return expired.length;
}

// ── Buyer Order Lifecycle (Strict 3-Audience Pricing Guard) ──────────────────

async function hydrateBuyerOrders(
  rows: (typeof orderRequests.$inferSelect)[],
): Promise<BuyerOrder[]> {
  if (rows.length === 0) return [];
  const orderIds = rows.map((r) => r.id);

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

  return rows.map((o) => {
    const rawItems = itemsByOrder.get(o.id) ?? [];
    const tierMarkup = Number(o.tierMarkupPercentAtSubmit);
    const items: BuyerOrderItem[] = rawItems.map((it) => {
      const originalUnitPrice =
        it.submittedUnitPrice !== null
          ? Number(it.submittedUnitPrice)
          : round2(Number(it.unitPriceBase) * (1 + tierMarkup / 100));
      const unitPrice = it.unitPriceFinal !== null ? Number(it.unitPriceFinal) : originalUnitPrice;
      return {
        id: it.id,
        productId: it.productId,
        name: resolveProductName(it.productNameSnapshot, o.locale),
        imageUrl: it.productImageUrlSnapshot ?? null,
        unit: it.productUnitSnapshot,
        moq: it.productMoqSnapshot,
        quantity: it.quantity,
        unitPrice,
        originalUnitPrice,
        lineSubtotal: round2(unitPrice * it.quantity),
        options: parseOptions(it.selectedOptions, o.locale),
        buyerNote: it.buyerNote ?? null,
      };
    });

    const confirmed = o.confirmedSubtotalAmount !== null;
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status as OrderStatus,
      currency: (confirmed ? o.confirmedCurrency : o.submittedCurrency)?.trim() || 'USD',
      subtotal: Number(confirmed ? o.confirmedSubtotalAmount : o.submittedSubtotalAmount),
      originalSubtotal: Number(o.submittedSubtotalAmount),
      grandTotal: o.confirmedGrandTotalAmount !== null ? Number(o.confirmedGrandTotalAmount) : null,
      items,
      notes: o.notesBuyer ?? null,
      rejectionReason: o.rejectionReason ?? null,
      submittedAt: asUtcIso(o.submittedAt) ?? o.submittedAt,
      confirmedAt: asUtcIso(o.confirmedAt),
      acceptedAt: asUtcIso(o.acceptedAt),
      rejectedAt: asUtcIso(o.rejectedAt),
      expiredAt: asUtcIso(o.expiredAt),
    };
  });
}

export async function listBuyerOrders(
  buyerId: string,
  query: ListBuyerOrdersQuery,
): Promise<BuyerOrderPage> {
  const { page, pageSize, status } = query;
  const offset = (page - 1) * pageSize;

  const filters = [eq(orderRequests.buyerId, buyerId), isNull(orderRequests.deletedAt)];
  if (status) {
    filters.push(eq(orderRequests.status, status));
  }
  const whereClause = and(...filters);

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select()
      .from(orderRequests)
      .where(whereClause)
      .orderBy(desc(orderRequests.submittedAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(orderRequests).where(whereClause),
  ]);

  const items = await hydrateBuyerOrders(rows);
  return {
    items,
    total: Number(total ?? 0),
    page,
    pageSize,
  };
}

export async function getBuyerOrder(buyerId: string, orderNumber: string): Promise<BuyerOrder> {
  const normalized = orderNumber.trim().toUpperCase();
  const [row] = await db
    .select()
    .from(orderRequests)
    .where(
      and(
        eq(orderRequests.buyerId, buyerId),
        eq(orderRequests.orderNumber, normalized),
        isNull(orderRequests.deletedAt),
      ),
    )
    .limit(1);

  if (!row) throw notFound('Order not found.');
  const [hydrated] = await hydrateBuyerOrders([row]);
  return hydrated!;
}

export async function submitBuyerOrder(
  buyerId: string,
  input: SubmitBuyerOrderInput,
): Promise<BuyerOrder> {
  const [buyer] = await db
    .select({
      email: authUser.email,
      contactName: authUser.contactName,
      name: authUser.name,
      verified: authUser.verified,
      banned: authUser.banned,
      tierMarkupPercent: buyerProfiles.tierMarkupPercent,
    })
    .from(authUser)
    .leftJoin(buyerProfiles, eq(buyerProfiles.authUserId, authUser.id))
    .where(and(eq(authUser.id, buyerId), eq(authUser.userType, 'buyer')))
    .limit(1);

  if (!buyer || buyer.banned) throw forbidden('Account is not active.');
  if (!buyer.verified) {
    throw forbidden('Your account must be verified before submitting an order request.');
  }

  const tier = Number(buyer.tierMarkupPercent ?? 0);
  const markupFactor = 1 + tier / 100;
  const skus = [...new Set(input.items.map((i) => i.sku.trim()))];

  const [variantRows, productRows] = await Promise.all([
    db
      .select({
        variantSku: productVariants.sku,
        variantBasePrice: productVariants.basePriceAmount,
        variantCurrency: productVariants.basePriceCurrency,
        variantMoq: productVariants.moq,
        product: products,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          inArray(productVariants.sku, skus),
          eq(productVariants.isActive, true),
          eq(products.status, 'published'),
          isNull(products.deletedAt),
        ),
      ),
    db
      .select()
      .from(products)
      .where(
        and(
          inArray(products.sku, skus),
          eq(products.status, 'published'),
          isNull(products.deletedAt),
        ),
      ),
  ]);

  const byVariantSku = new Map(variantRows.map((v) => [v.variantSku!, v]));
  const byProductSku = new Map(productRows.map((p) => [p.sku!, p]));

  const resolvedProductIds = new Set<string>();
  const resolvedLines = input.items.map((item) => {
    const sku = item.sku.trim();
    const v = byVariantSku.get(sku);
    if (v) {
      const base = Number(v.variantBasePrice ?? v.product.basePriceAmount ?? 0);
      const currency = (v.variantCurrency ?? v.product.basePriceCurrency ?? 'USD').trim();
      const moq = v.variantMoq ?? v.product.moq;
      if (base <= 0) throw invalid(`Product ${sku} is not available for ordering.`);
      if (item.quantity < moq) {
        throw invalid(`Minimum order quantity for ${sku} is ${moq}.`);
      }
      resolvedProductIds.add(v.product.id);
      return { product: v.product, base, currency, moq, item };
    }
    const p = byProductSku.get(sku);
    if (p) {
      const base = Number(p.basePriceAmount ?? 0);
      const currency = (p.basePriceCurrency ?? 'USD').trim();
      if (base <= 0) throw invalid(`Product ${sku} is not available for ordering.`);
      if (item.quantity < p.moq) {
        throw invalid(`Minimum order quantity for ${sku} is ${p.moq}.`);
      }
      resolvedProductIds.add(p.id);
      return { product: p, base, currency, moq: p.moq, item };
    }
    throw invalid(`Product ${sku} was not found.`);
  });

  const currency = resolvedLines[0]!.currency;
  if (resolvedLines.some((l) => l.currency !== currency)) {
    throw invalid('All items in a single order request must use the same currency.');
  }

  const pIds = [...resolvedProductIds];
  const [translations, images] = await Promise.all([
    db.select().from(productTranslations).where(inArray(productTranslations.productId, pIds)),
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, pIds))
      .orderBy(asc(productImages.sortOrder)),
  ]);

  const nameByProduct = new Map<string, string>();
  for (const pId of pIds) {
    const prodTrans = translations.filter((t) => t.productId === pId);
    const chosen =
      prodTrans.find((t) => t.locale === input.locale)?.name ||
      prodTrans.find((t) => t.locale === 'en')?.name ||
      prodTrans[0]?.name ||
      'Product';
    nameByProduct.set(pId, chosen);
  }

  const imageByProduct = new Map<string, string | null>();
  for (const pId of pIds) {
    const prodImgs = images.filter((img) => img.productId === pId);
    const chosen = prodImgs.find((img) => img.isPrimary) ?? prodImgs[0];
    imageByProduct.set(pId, chosen ? resolveImageUrl(chosen.url) : null);
  }

  const year = new Date().getUTCFullYear();
  const [seq] = await db
    .insert(orderNumberSequence)
    .values({ year, lastNumber: 1 })
    .onConflictDoUpdate({
      target: orderNumberSequence.year,
      set: { lastNumber: sql`${orderNumberSequence.lastNumber} + 1` },
    })
    .returning({ lastNumber: orderNumberSequence.lastNumber });

  const orderNumber = `O-${year}-${String(seq!.lastNumber).padStart(4, '0')}`;
  const orderId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  let subtotal = 0;
  const itemValues = resolvedLines.map((line, index) => {
    const submittedUnit = round2(line.base * markupFactor);
    subtotal = round2(subtotal + round2(submittedUnit * line.item.quantity));
    return {
      orderRequestId: orderId,
      productId: line.product.id,
      productNameSnapshot: nameByProduct.get(line.product.id) ?? 'Product',
      productImageUrlSnapshot: imageByProduct.get(line.product.id) ?? null,
      productUnitSnapshot: line.product.unit,
      productMoqSnapshot: line.moq,
      quantity: line.item.quantity,
      unitPriceBase: String(line.base),
      submittedUnitPrice: String(submittedUnit),
      currency,
      selectedOptions: line.item.options && line.item.options.length > 0 ? line.item.options : null,
      sortOrder: index,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });

  await db.batch([
    db.insert(orderRequests).values({
      id: orderId,
      orderNumber,
      buyerId,
      locale: input.locale,
      status: 'submitted',
      tierMarkupPercentAtSubmit: String(tier),
      submittedSubtotalAmount: String(subtotal),
      submittedCurrency: currency,
      notesBuyer: input.notes?.trim() || null,
      submittedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
    db.insert(orderRequestItems).values(itemValues),
  ]);

  void notifyOrderSubmitted({
    to: buyer.email,
    contactName: buyer.contactName ?? buyer.name,
    orderNumber,
    submittedSubtotalAmount: subtotal,
    currency,
  });

  return getBuyerOrder(buyerId, orderNumber);
}

export async function acceptBuyerOrder(buyerId: string, orderNumber: string): Promise<BuyerOrder> {
  const normalized = orderNumber.trim().toUpperCase();
  const [order] = await db
    .select()
    .from(orderRequests)
    .where(
      and(
        eq(orderRequests.buyerId, buyerId),
        eq(orderRequests.orderNumber, normalized),
        isNull(orderRequests.deletedAt),
      ),
    )
    .limit(1);

  if (!order) throw notFound('Order not found.');
  if (order.status !== 'confirmed') {
    throw conflict(`Only confirmed quotes can be accepted (current status: ${order.status}).`);
  }

  const cutoffMs = await resolveOrderExpiryCutoffMs();
  const submittedMs = Date.parse(asUtcIso(order.submittedAt) ?? order.submittedAt);
  const nowIso = new Date().toISOString();
  if (!Number.isNaN(submittedMs) && submittedMs < cutoffMs) {
    await db
      .update(orderRequests)
      .set({ status: 'expired', expiredAt: nowIso, updatedAt: nowIso })
      .where(and(eq(orderRequests.id, order.id), eq(orderRequests.status, 'confirmed')));
    await recordAudit({
      actorType: 'system',
      action: 'order.expired',
      resourceType: 'order',
      resourceId: order.id,
      target: order.orderNumber,
      summary: `Auto-expired stale order ${order.orderNumber}`,
      beforeState: { status: 'confirmed' },
      afterState: { status: 'expired' },
    });
    throw conflict('This quote has expired and can no longer be accepted.');
  }

  const [updated] = await db
    .update(orderRequests)
    .set({
      status: 'accepted',
      acceptedAt: nowIso,
      updatedAt: nowIso,
    })
    .where(and(eq(orderRequests.id, order.id), eq(orderRequests.status, 'confirmed')))
    .returning({ id: orderRequests.id });

  if (!updated) {
    throw conflict('Order status changed concurrently; please refresh and try again.');
  }

  return getBuyerOrder(buyerId, orderNumber);
}

export async function rejectBuyerOrder(
  buyerId: string,
  orderNumber: string,
  input: RejectOrderInput,
): Promise<BuyerOrder> {
  const normalized = orderNumber.trim().toUpperCase();
  const [order] = await db
    .select()
    .from(orderRequests)
    .where(
      and(
        eq(orderRequests.buyerId, buyerId),
        eq(orderRequests.orderNumber, normalized),
        isNull(orderRequests.deletedAt),
      ),
    )
    .limit(1);

  if (!order) throw notFound('Order not found.');
  if (order.status !== 'confirmed' && order.status !== 'submitted') {
    throw conflict(`Cannot reject an order in status "${order.status}".`);
  }

  const nowIso = new Date().toISOString();
  const [updated] = await db
    .update(orderRequests)
    .set({
      status: 'rejected',
      rejectionReason: input.reason?.trim() || null,
      rejectedAt: nowIso,
      updatedAt: nowIso,
    })
    .where(
      and(
        eq(orderRequests.id, order.id),
        inArray(orderRequests.status, ['submitted', 'confirmed']),
      ),
    )
    .returning({ id: orderRequests.id });

  if (!updated) {
    throw conflict('Order status changed concurrently; please refresh and try again.');
  }

  return getBuyerOrder(buyerId, orderNumber);
}
