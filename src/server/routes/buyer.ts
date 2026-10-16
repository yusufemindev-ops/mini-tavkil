import { Hono } from 'hono';
import { getBuyerSession, requireBuyerSession, toBuyerProfilePublic } from '@/lib/buyer-guard';
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
import { adminJson, parseJson, type AppEnv } from '@/server/factory';

export const buyerRoutes = new Hono<AppEnv>()
  .get('/me', async (c) => {
    const buyer = await getBuyerSession(c.req.raw);
    return adminJson(c, buyer ? toBuyerProfilePublic(buyer) : null);
  })
  .get('/profile-edit-requests/pending', async (c) => {
    const buyer = await requireBuyerSession(c.req.raw);
    const pending = await getPendingProfileEditRequest(buyer.id);
    return adminJson(c, pending);
  })
  .post('/profile-edit-requests', async (c) => {
    const buyer = await requireBuyerSession(c.req.raw);
    const body = await parseJson(c, submitProfileEditRequestSchema);
    const created = await submitProfileEditRequest(buyer.id, body);
    return adminJson(c, created, 201);
  })
  .delete('/profile-edit-requests/pending', async (c) => {
    const buyer = await requireBuyerSession(c.req.raw);
    const res = await cancelProfileEditRequest(buyer.id);
    return adminJson(c, res);
  })
  .get('/notifications', async (c) => {
    const buyer = await requireBuyerSession(c.req.raw);
    const items = await listBuyerNotifications(buyer.id);
    return adminJson(c, items);
  })
  .get('/products/:slug', async (c) => {
    const buyer = await requireBuyerSession(c.req.raw);
    const pricing = await getBuyerProductPricing(c.req.param('slug'), buyer);
    return adminJson(c, pricing);
  })
  .get('/orders', async (c) => {
    const buyer = await requireBuyerSession(c.req.raw);
    const url = new URL(c.req.url);
    const query = listBuyerOrdersQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const page = await listBuyerOrders(buyer.id, query);
    return adminJson(c, page);
  })
  .post('/orders', async (c) => {
    const buyer = await requireBuyerSession(c.req.raw);
    const body = await parseJson(c, submitBuyerOrderSchema);
    const created = await submitBuyerOrder(buyer.id, body);
    return adminJson(c, created, 201);
  })
  .get('/orders/:orderNumber', async (c) => {
    const buyer = await requireBuyerSession(c.req.raw);
    const order = await getBuyerOrder(buyer.id, c.req.param('orderNumber'));
    return adminJson(c, order);
  })
  .post('/orders/:orderNumber/accept', async (c) => {
    const buyer = await requireBuyerSession(c.req.raw);
    const order = await acceptBuyerOrder(buyer.id, c.req.param('orderNumber'));
    return adminJson(c, order);
  })
  .post('/orders/:orderNumber/reject', async (c) => {
    const buyer = await requireBuyerSession(c.req.raw);
    const body = await parseJson(c, rejectOrderSchema);
    const order = await rejectBuyerOrder(buyer.id, c.req.param('orderNumber'), body);
    return adminJson(c, order);
  });
