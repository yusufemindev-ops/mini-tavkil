import { Hono } from 'hono';
import {
  adminListProductsSchema,
  createProductSchema,
  reorderProductsSchema,
  updateProductSchema,
} from '@/lib/services/catalog-schemas';
import {
  archiveProduct,
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  productStatusCounts,
  publishProduct,
  reorderProducts,
  restoreProduct,
  unpublishProduct,
  updateProduct,
} from '@/lib/services/products';
import { adminJson, auditAdmin, parseJson, requireAdminPerm, type AppEnv } from '@/server/factory';

function productLabel(prod: {
  id: string;
  sku?: string | null;
  translations?: { locale: string; name: string }[];
}) {
  return (
    prod.sku ||
    prod.translations?.find((t) => t.locale === 'en')?.name ||
    prod.translations?.[0]?.name ||
    prod.id
  );
}

export const adminProductsRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('products:view'), async (c) => {
    const query = adminListProductsSchema.parse(c.req.query());
    return adminJson(c, await listProducts(query));
  })
  .post('/', requireAdminPerm('products:create'), async (c) => {
    const body = await parseJson(c, createProductSchema);
    const created = await createProduct(body, c.var.admin.id);
    const target = productLabel(created);
    await auditAdmin(c, {
      action: 'product.created',
      resourceType: 'product',
      resourceId: created.id,
      target,
      summary: `Created product "${target}"`,
    });
    return adminJson(c, created);
  })
  .get('/counts', requireAdminPerm('products:view'), async (c) => {
    const query = adminListProductsSchema.parse(c.req.query());
    return adminJson(c, await productStatusCounts(query));
  })
  .post('/reorder', requireAdminPerm('products:edit'), async (c) => {
    const body = await parseJson(c, reorderProductsSchema);
    const res = await reorderProducts(body.categoryId, body.ids);
    await auditAdmin(c, {
      action: 'product.reordered',
      resourceType: 'product',
      resourceId: body.categoryId,
      target: `${body.ids.length} products`,
      summary: `Reordered ${body.ids.length} products in category`,
    });
    return adminJson(c, res);
  })
  .get('/:id', requireAdminPerm('products:view'), async (c) => {
    return adminJson(c, await getProduct(c.req.param('id')));
  })
  .patch('/:id', requireAdminPerm('products:edit'), async (c) => {
    const body = await parseJson(c, updateProductSchema);
    const updated = await updateProduct(c.req.param('id'), body, c.var.admin.id);
    const target = productLabel(updated);
    await auditAdmin(c, {
      action: 'product.updated',
      resourceType: 'product',
      resourceId: updated.id,
      target,
      summary: `Updated product "${target}"`,
    });
    return adminJson(c, updated);
  })
  .delete('/:id', requireAdminPerm('products:delete'), async (c) => {
    const id = c.req.param('id');
    const existing = await getProduct(id).catch(() => null);
    const target = existing ? productLabel(existing) : id;
    const deleted = await deleteProduct(id);
    await auditAdmin(c, {
      action: 'product.deleted',
      resourceType: 'product',
      resourceId: id,
      target,
      summary: `Deleted product "${target}"`,
    });
    return adminJson(c, deleted);
  })
  .post('/:id/publish', requireAdminPerm('products:publish'), async (c) => {
    const published = await publishProduct(c.req.param('id'));
    const target = productLabel(published);
    await auditAdmin(c, {
      action: 'product.published',
      resourceType: 'product',
      resourceId: published.id,
      target,
      summary: `Published product "${target}"`,
    });
    return adminJson(c, published);
  })
  .post('/:id/unpublish', requireAdminPerm('products:publish'), async (c) => {
    const unpublished = await unpublishProduct(c.req.param('id'));
    const target = productLabel(unpublished);
    await auditAdmin(c, {
      action: 'product.unpublished',
      resourceType: 'product',
      resourceId: unpublished.id,
      target,
      summary: `Unpublished product "${target}"`,
    });
    return adminJson(c, unpublished);
  })
  .post('/:id/archive', requireAdminPerm('products:delete'), async (c) => {
    const archived = await archiveProduct(c.req.param('id'));
    const target = productLabel(archived);
    await auditAdmin(c, {
      action: 'product.archived',
      resourceType: 'product',
      resourceId: archived.id,
      target,
      summary: `Archived product "${target}"`,
    });
    return adminJson(c, archived);
  })
  .post('/:id/restore', requireAdminPerm('products:delete'), async (c) => {
    const restored = await restoreProduct(c.req.param('id'));
    const target = productLabel(restored);
    await auditAdmin(c, {
      action: 'product.restored',
      resourceType: 'product',
      resourceId: restored.id,
      target,
      summary: `Restored product "${target}"`,
    });
    return adminJson(c, restored);
  });
