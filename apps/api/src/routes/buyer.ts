import { Hono } from 'hono';
import { getBuyerSession, toBuyerProfilePublic } from '@/lib/buyer-guard';
import { getBuyerProductPricing, listBuyerNotifications } from '@/lib/services/buyer-portal';
import {
  acceptBuyerOrder,
  getBuyerOrder,
  listBuyerOrders,
  rejectBuyerOrder,
  submitBuyerOrder,
} from '@/lib/services/orders';
import {
  listBuyerOrdersQuerySchema,
  rejectOrderSchema,
  submitBuyerOrderSchema,
} from '@/lib/services/orders-schema';
import {
  cancelProfileEditRequest,
  getPendingProfileEditRequest,
  submitProfileEditRequest,
} from '@/lib/services/profile-edit-requests';
import { submitProfileEditRequestSchema } from '@/lib/services/profile-edit-requests-schema';
import {
  adminJson,
  auditBuyer,
  parseJson,
  parseQuery,
  requireBuyer,
  type AppEnv,
} from '@/server/factory';

export const buyerRoutes = new Hono<AppEnv>()
  .get('/me', async (c) => {
    const buyer = await getBuyerSession(c.req.raw);
    return adminJson(c, buyer ? toBuyerProfilePublic(buyer) : null);
  })
  .get('/profile-edit-requests/pending', requireBuyer(), async (c) => {
    const pending = await getPendingProfileEditRequest(c.var.buyer.id);
    return adminJson(c, pending);
  })
  .post('/profile-edit-requests', requireBuyer(), async (c) => {
    const buyer = c.var.buyer;
    const body = await parseJson(c, submitProfileEditRequestSchema);
    const created = await submitProfileEditRequest(buyer.id, body);
    await auditBuyer(c, buyer.id, {
      action: 'profile_edit_request.submitted',
      resourceType: 'account_request',
      resourceId: created.id,
      target: buyer.email,
      summary: `Submitted profile edit request for ${buyer.email}`,
    });
    return adminJson(c, created, 201);
  })
  .delete('/profile-edit-requests/pending', requireBuyer(), async (c) => {
    const buyer = c.var.buyer;
    const res = await cancelProfileEditRequest(buyer.id);
    await auditBuyer(c, buyer.id, {
      action: 'profile_edit_request.cancelled',
      resourceType: 'account_request',
      resourceId: buyer.id,
      target: buyer.email,
      summary: `Cancelled pending profile edit request for ${buyer.email}`,
    });
    return adminJson(c, res);
  })
  .get('/notifications', requireBuyer(), async (c) => {
    const items = await listBuyerNotifications(c.var.buyer.id);
    return adminJson(c, items);
  })
  .get('/products/:slug', requireBuyer(), async (c) => {
    const pricing = await getBuyerProductPricing(c.req.param('slug'), c.var.buyer);
    return adminJson(c, pricing);
  })
  .get('/orders', requireBuyer(), async (c) => {
    const query = parseQuery(c, listBuyerOrdersQuerySchema);
    const page = await listBuyerOrders(c.var.buyer.id, query);
    return adminJson(c, page);
  })
  .post('/orders', requireBuyer(), async (c) => {
    const buyer = c.var.buyer;
    const body = await parseJson(c, submitBuyerOrderSchema);
    const created = await submitBuyerOrder(buyer.id, body);
    await auditBuyer(c, buyer.id, {
      action: 'order.submitted',
      resourceType: 'order',
      resourceId: created.id,
      target: created.orderNumber,
      summary: `Submitted order request ${created.orderNumber} (${created.currency} ${created.subtotal.toFixed(2)})`,
    });
    return adminJson(c, created, 201);
  })
  .get('/orders/:orderNumber', requireBuyer(), async (c) => {
    const order = await getBuyerOrder(c.var.buyer.id, c.req.param('orderNumber'));
    return adminJson(c, order);
  })
  .post('/orders/:orderNumber/accept', requireBuyer(), async (c) => {
    const buyer = c.var.buyer;
    const order = await acceptBuyerOrder(buyer.id, c.req.param('orderNumber'));
    await auditBuyer(c, buyer.id, {
      action: 'order.accepted',
      resourceType: 'order',
      resourceId: order.id,
      target: order.orderNumber,
      summary: `Accepted confirmed quote ${order.orderNumber}`,
    });
    return adminJson(c, order);
  })
  .post('/orders/:orderNumber/reject', requireBuyer(), async (c) => {
    const buyer = c.var.buyer;
    const body = await parseJson(c, rejectOrderSchema);
    const order = await rejectBuyerOrder(buyer.id, c.req.param('orderNumber'), body);
    await auditBuyer(c, buyer.id, {
      action: 'order.rejected_by_buyer',
      resourceType: 'order',
      resourceId: order.id,
      target: order.orderNumber,
      summary: `Declined order ${order.orderNumber}${body.reason ? `: ${body.reason}` : ''}`,
    });
    return adminJson(c, order);
  });
