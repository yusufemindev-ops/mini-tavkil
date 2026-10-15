import { Hono } from 'hono';
import {
  createBuyer,
  deleteBuyer,
  getBuyer,
  listBuyers,
  setBuyerSuspended,
  setBuyerVerified,
  updateBuyer,
} from '@/lib/services/buyers';
import { createBuyerSchema, updateBuyerSchema } from '@/lib/services/buyers-schema';
import { adminJson, auditAdmin, parseJson, requireAdminPerm, type AppEnv } from '@/server/factory';

export const adminBuyersRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('buyers:view'), async (c) => {
    return adminJson(c, await listBuyers());
  })
  .post('/', requireAdminPerm('buyers:create'), async (c) => {
    const body = await parseJson(c, createBuyerSchema);
    const created = await createBuyer(body);
    await auditAdmin(c, {
      action: 'buyer.created',
      resourceType: 'buyer',
      resourceId: created.id,
      target: created.email,
      summary: `Provisioned buyer ${created.email}`,
    });
    return adminJson(c, created, 201);
  })
  .get('/:id', requireAdminPerm('buyers:view'), async (c) => {
    return adminJson(c, await getBuyer(c.req.param('id')));
  })
  .patch('/:id', requireAdminPerm('buyers:edit'), async (c) => {
    const body = await parseJson(c, updateBuyerSchema);
    const updated = await updateBuyer(c.req.param('id'), body);
    await auditAdmin(c, {
      action: 'buyer.updated',
      resourceType: 'buyer',
      resourceId: updated.id,
      target: updated.email,
      summary: `Updated buyer ${updated.company ?? updated.email} (tier markup ${updated.tierMarkup}%)`,
    });
    return adminJson(c, updated);
  })
  .post('/:id/verify', requireAdminPerm('buyers:edit'), async (c) => {
    const updated = await setBuyerVerified(c.req.param('id'), true);
    await auditAdmin(c, {
      action: 'buyer.verified',
      resourceType: 'buyer',
      resourceId: updated.id,
      target: updated.email,
      summary: `Marked buyer ${updated.email} as verified`,
    });
    return adminJson(c, updated);
  })
  .post('/:id/unverify', requireAdminPerm('buyers:edit'), async (c) => {
    const updated = await setBuyerVerified(c.req.param('id'), false);
    await auditAdmin(c, {
      action: 'buyer.unverified',
      resourceType: 'buyer',
      resourceId: updated.id,
      target: updated.email,
      summary: `Marked buyer ${updated.email} as unverified`,
    });
    return adminJson(c, updated);
  })
  .post('/:id/suspend', requireAdminPerm('buyers:disable'), async (c) => {
    const updated = await setBuyerSuspended(c.req.param('id'), true);
    await auditAdmin(c, {
      action: 'buyer.suspended',
      resourceType: 'buyer',
      resourceId: updated.id,
      target: updated.email,
      summary: `Suspended buyer account ${updated.email}`,
    });
    return adminJson(c, updated);
  })
  .post('/:id/reactivate', requireAdminPerm('buyers:disable'), async (c) => {
    const updated = await setBuyerSuspended(c.req.param('id'), false);
    await auditAdmin(c, {
      action: 'buyer.reactivated',
      resourceType: 'buyer',
      resourceId: updated.id,
      target: updated.email,
      summary: `Reactivated buyer account ${updated.email}`,
    });
    return adminJson(c, updated);
  })
  .delete('/:id', requireAdminPerm('buyers:disable'), async (c) => {
    const deleted = await deleteBuyer(c.req.param('id'));
    await auditAdmin(c, {
      action: 'buyer.deleted',
      resourceType: 'buyer',
      resourceId: deleted.id,
      target: deleted.email,
      summary: `Deleted buyer account ${deleted.email}`,
    });
    return adminJson(c, { id: deleted.id });
  });
