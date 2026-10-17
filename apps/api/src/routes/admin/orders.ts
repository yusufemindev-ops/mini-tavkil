import { Hono } from 'hono';
import {
  assignAdminOrder,
  confirmAdminOrder,
  getAdminOrder,
  listAdminOrders,
  rejectAdminOrder,
} from '@/lib/services/orders';
import {
  assignOrderSchema,
  confirmOrderSchema,
  listAdminOrdersSchema,
  rejectOrderSchema,
} from '@/lib/services/orders-schema';
import {
  adminJson,
  auditAdmin,
  parseJson,
  parseQuery,
  requireAdminPerm,
  type AppEnv,
} from '@/server/factory';

export const adminOrdersRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('orders:view'), async (c) => {
    const query = parseQuery(c, listAdminOrdersSchema);
    return adminJson(c, await listAdminOrders(query));
  })
  .get('/:id', requireAdminPerm('orders:view'), async (c) => {
    return adminJson(c, await getAdminOrder(c.req.param('id')));
  })
  .post('/:id/confirm', requireAdminPerm('orders:confirm'), async (c) => {
    const body = await parseJson(c, confirmOrderSchema);
    const id = c.req.param('id');
    const before = await getAdminOrder(id);
    const updated = await confirmAdminOrder(id, body, c.var.admin.id);
    await auditAdmin(c, {
      action: 'order.confirmed',
      resourceType: 'order',
      resourceId: updated.id,
      target: updated.orderNumber,
      summary: `Confirmed quote for ${updated.orderNumber} (${updated.currency} ${updated.confirmedGrandTotal?.toFixed(2) ?? '0.00'})`,
      beforeState: {
        status: before.status,
        submittedSubtotal: before.submittedSubtotal,
        confirmedGrandTotal: before.confirmedGrandTotal,
      },
      afterState: {
        status: updated.status,
        confirmedMarkupPercent: updated.confirmedMarkupPercent,
        confirmedGrandTotal: updated.confirmedGrandTotal,
      },
    });
    return adminJson(c, updated);
  })
  .post('/:id/reject', requireAdminPerm('orders:reject'), async (c) => {
    const body = await parseJson(c, rejectOrderSchema);
    const id = c.req.param('id');
    const before = await getAdminOrder(id);
    const updated = await rejectAdminOrder(id, body);
    await auditAdmin(c, {
      action: 'order.rejected',
      resourceType: 'order',
      resourceId: updated.id,
      target: updated.orderNumber,
      summary: `Rejected order ${updated.orderNumber}`,
      beforeState: { status: before.status },
      afterState: { status: updated.status, rejectionReason: updated.rejectionReason },
    });
    return adminJson(c, updated);
  })
  .patch('/:id/assign', requireAdminPerm('orders:assign'), async (c) => {
    const body = await parseJson(c, assignOrderSchema);
    const id = c.req.param('id');
    const before = await getAdminOrder(id);
    const updated = await assignAdminOrder(id, body);
    await auditAdmin(c, {
      action: 'order.assigned',
      resourceType: 'order',
      resourceId: updated.id,
      target: updated.orderNumber,
      summary: body.assignedUserId
        ? `Assigned order ${updated.orderNumber}`
        : `Unassigned order ${updated.orderNumber}`,
      beforeState: { assignedUserId: before.assignedUserId },
      afterState: { assignedUserId: updated.assignedUserId },
    });
    return adminJson(c, updated);
  });
