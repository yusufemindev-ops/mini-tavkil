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
import { adminJson, auditAdmin, parseJson, requireAdminPerm, type AppEnv } from '@/server/factory';

function supplierLabel(sup: { id: string; translations?: { locale: string; name: string }[] }) {
  return (
    sup.translations?.find((t) => t.locale === 'en')?.name ?? sup.translations?.[0]?.name ?? sup.id
  );
}

export const adminSuppliersRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('suppliers:view'), async (c) => {
    return adminJson(c, await listSuppliers());
  })
  .post('/', requireAdminPerm('suppliers:create'), async (c) => {
    const body = await parseJson(c, createSupplierSchema);
    const created = await createSupplier(body);
    const target = supplierLabel(created);
    await auditAdmin(c, {
      action: 'supplier.created',
      resourceType: 'supplier',
      resourceId: created.id,
      target,
      summary: `Created supplier "${target}"`,
    });
    return adminJson(c, created);
  })
  .get('/:id', requireAdminPerm('suppliers:view'), async (c) => {
    return adminJson(c, await getSupplier(c.req.param('id')));
  })
  .patch('/:id', requireAdminPerm('suppliers:edit'), async (c) => {
    const body = await parseJson(c, updateSupplierSchema);
    const updated = await updateSupplier(c.req.param('id'), body);
    const target = supplierLabel(updated);
    await auditAdmin(c, {
      action: 'supplier.updated',
      resourceType: 'supplier',
      resourceId: updated.id,
      target,
      summary: `Updated supplier "${target}"`,
    });
    return adminJson(c, updated);
  })
  .delete('/:id', requireAdminPerm('suppliers:delete'), async (c) => {
    const id = c.req.param('id');
    const existing = await getSupplier(id).catch(() => null);
    const target = existing ? supplierLabel(existing) : id;
    const deleted = await deleteSupplier(id);
    await auditAdmin(c, {
      action: 'supplier.deleted',
      resourceType: 'supplier',
      resourceId: id,
      target,
      summary: `Deleted supplier "${target}"`,
    });
    return adminJson(c, deleted);
  })
  .post('/:id/publish', requireAdminPerm('suppliers:publish'), async (c) => {
    const published = await publishSupplier(c.req.param('id'));
    const target = supplierLabel(published);
    await auditAdmin(c, {
      action: 'supplier.published',
      resourceType: 'supplier',
      resourceId: published.id,
      target,
      summary: `Published supplier "${target}"`,
    });
    return adminJson(c, published);
  })
  .post('/:id/unpublish', requireAdminPerm('suppliers:publish'), async (c) => {
    const unpublished = await unpublishSupplier(c.req.param('id'));
    const target = supplierLabel(unpublished);
    await auditAdmin(c, {
      action: 'supplier.unpublished',
      resourceType: 'supplier',
      resourceId: unpublished.id,
      target,
      summary: `Unpublished supplier "${target}"`,
    });
    return adminJson(c, unpublished);
  });
