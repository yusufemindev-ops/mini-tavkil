import { Hono } from 'hono';
import {
  createCategorySchema,
  reorderSchema,
  updateCategorySchema,
} from '@/lib/services/catalog-schemas';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  publishCategory,
  reorderCategories,
  unpublishCategory,
  updateCategory,
} from '@/lib/services/categories';
import { adminJson, parseJson, requireAdminPerm, type AppEnv } from '@/server/factory';

export const adminCategoriesRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('categories:view'), async (c) => {
    return adminJson(c, await listCategories());
  })
  .post('/', requireAdminPerm('categories:create'), async (c) => {
    const body = await parseJson(c, createCategorySchema);
    return adminJson(c, await createCategory(body));
  })
  .post('/reorder', requireAdminPerm('categories:edit'), async (c) => {
    const body = await parseJson(c, reorderSchema);
    return adminJson(c, await reorderCategories(body.ids));
  })
  .get('/:id', requireAdminPerm('categories:view'), async (c) => {
    return adminJson(c, await getCategory(c.req.param('id')));
  })
  .patch('/:id', requireAdminPerm('categories:edit'), async (c) => {
    const body = await parseJson(c, updateCategorySchema);
    return adminJson(c, await updateCategory(c.req.param('id'), body));
  })
  .delete('/:id', requireAdminPerm('categories:delete'), async (c) => {
    return adminJson(c, await deleteCategory(c.req.param('id')));
  })
  .post('/:id/publish', requireAdminPerm('categories:publish'), async (c) => {
    return adminJson(c, await publishCategory(c.req.param('id')));
  })
  .post('/:id/unpublish', requireAdminPerm('categories:publish'), async (c) => {
    return adminJson(c, await unpublishCategory(c.req.param('id')));
  });
