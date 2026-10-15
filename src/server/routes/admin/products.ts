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
import { adminJson, parseJson, requireAdminPerm, type AppEnv } from '@/server/factory';

export const adminProductsRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('products:view'), async (c) => {
    const query = adminListProductsSchema.parse(c.req.query());
    return adminJson(c, await listProducts(query));
  })
  .post('/', requireAdminPerm('products:create'), async (c) => {
    const body = await parseJson(c, createProductSchema);
    return adminJson(c, await createProduct(body, c.var.admin.id));
  })
  .get('/counts', requireAdminPerm('products:view'), async (c) => {
    const query = adminListProductsSchema.parse(c.req.query());
    return adminJson(c, await productStatusCounts(query));
  })
  .post('/reorder', requireAdminPerm('products:edit'), async (c) => {
    const body = await parseJson(c, reorderProductsSchema);
    return adminJson(c, await reorderProducts(body.categoryId, body.ids));
  })
  .get('/:id', requireAdminPerm('products:view'), async (c) => {
    return adminJson(c, await getProduct(c.req.param('id')));
  })
  .patch('/:id', requireAdminPerm('products:edit'), async (c) => {
    const body = await parseJson(c, updateProductSchema);
    return adminJson(c, await updateProduct(c.req.param('id'), body, c.var.admin.id));
  })
  .delete('/:id', requireAdminPerm('products:delete'), async (c) => {
    return adminJson(c, await deleteProduct(c.req.param('id')));
  })
  .post('/:id/publish', requireAdminPerm('products:publish'), async (c) => {
    return adminJson(c, await publishProduct(c.req.param('id')));
  })
  .post('/:id/unpublish', requireAdminPerm('products:publish'), async (c) => {
    return adminJson(c, await unpublishProduct(c.req.param('id')));
  })
  .post('/:id/archive', requireAdminPerm('products:delete'), async (c) => {
    return adminJson(c, await archiveProduct(c.req.param('id')));
  })
  .post('/:id/restore', requireAdminPerm('products:delete'), async (c) => {
    return adminJson(c, await restoreProduct(c.req.param('id')));
  });
