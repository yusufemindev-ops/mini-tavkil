import { Hono } from 'hono';
import {
  createSupplier,
  createSupplierSchema,
  deleteSupplier,
  getSupplier,
  listSuppliers,
  publishSupplier,
  unpublishSupplier,
  updateSupplier,
  updateSupplierSchema,
} from '@/lib/services/suppliers';
import { adminJson, parseJson, requireAdminPerm, type AppEnv } from '@/server/factory';

export const adminSuppliersRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('suppliers:view'), async (c) => {
    return adminJson(c, await listSuppliers());
  })
  .post('/', requireAdminPerm('suppliers:create'), async (c) => {
    const body = await parseJson(c, createSupplierSchema);
    return adminJson(c, await createSupplier(body));
  })
  .get('/:id', requireAdminPerm('suppliers:view'), async (c) => {
    return adminJson(c, await getSupplier(c.req.param('id')));
  })
  .patch('/:id', requireAdminPerm('suppliers:edit'), async (c) => {
    const body = await parseJson(c, updateSupplierSchema);
    return adminJson(c, await updateSupplier(c.req.param('id'), body));
  })
  .delete('/:id', requireAdminPerm('suppliers:delete'), async (c) => {
    return adminJson(c, await deleteSupplier(c.req.param('id')));
  })
  .post('/:id/publish', requireAdminPerm('suppliers:publish'), async (c) => {
    return adminJson(c, await publishSupplier(c.req.param('id')));
  })
  .post('/:id/unpublish', requireAdminPerm('suppliers:publish'), async (c) => {
    return adminJson(c, await unpublishSupplier(c.req.param('id')));
  });
