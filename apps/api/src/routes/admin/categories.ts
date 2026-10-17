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
import { adminJson, auditAdmin, parseJson, requireAdminPerm, type AppEnv } from '@/server/factory';

function categoryLabel(cat: { id: string; translations?: { locale: string; name: string }[] }) {
  return (
    cat.translations?.find((t) => t.locale === 'en')?.name ?? cat.translations?.[0]?.name ?? cat.id
  );
}

export const adminCategoriesRoutes = new Hono<AppEnv>()
  .get('/', requireAdminPerm('categories:view'), async (c) => {
    return adminJson(c, await listCategories());
  })
  .post('/', requireAdminPerm('categories:create'), async (c) => {
    const body = await parseJson(c, createCategorySchema);
    const created = await createCategory(body);
    const target = categoryLabel(created);
    await auditAdmin(c, {
      action: 'category.created',
      resourceType: 'category',
      resourceId: created.id,
      target,
      summary: `Created category "${target}"`,
    });
    return adminJson(c, created);
  })
  .post('/reorder', requireAdminPerm('categories:edit'), async (c) => {
    const body = await parseJson(c, reorderSchema);
    const res = await reorderCategories(body.ids);
    await auditAdmin(c, {
      action: 'category.reordered',
      resourceType: 'category',
      target: `${body.ids.length} categories`,
      summary: `Reordered ${body.ids.length} categories`,
    });
    return adminJson(c, res);
  })
  .get('/:id', requireAdminPerm('categories:view'), async (c) => {
    return adminJson(c, await getCategory(c.req.param('id')));
  })
  .patch('/:id', requireAdminPerm('categories:edit'), async (c) => {
    const body = await parseJson(c, updateCategorySchema);
    const updated = await updateCategory(c.req.param('id'), body);
    const target = categoryLabel(updated);
    await auditAdmin(c, {
      action: 'category.updated',
      resourceType: 'category',
      resourceId: updated.id,
      target,
      summary: `Updated category "${target}"`,
    });
    return adminJson(c, updated);
  })
  .delete('/:id', requireAdminPerm('categories:delete'), async (c) => {
    const id = c.req.param('id');
    const existing = await getCategory(id).catch(() => null);
    const target = existing ? categoryLabel(existing) : id;
    const deleted = await deleteCategory(id);
    await auditAdmin(c, {
      action: 'category.deleted',
      resourceType: 'category',
      resourceId: id,
      target,
      summary: `Deleted category "${target}"`,
    });
    return adminJson(c, deleted);
  })
  .post('/:id/publish', requireAdminPerm('categories:publish'), async (c) => {
    const published = await publishCategory(c.req.param('id'));
    const target = categoryLabel(published);
    await auditAdmin(c, {
      action: 'category.published',
      resourceType: 'category',
      resourceId: published.id,
      target,
      summary: `Published category "${target}"`,
    });
    return adminJson(c, published);
  })
  .post('/:id/unpublish', requireAdminPerm('categories:publish'), async (c) => {
    const unpublished = await unpublishCategory(c.req.param('id'));
    const target = categoryLabel(unpublished);
    await auditAdmin(c, {
      action: 'category.unpublished',
      resourceType: 'category',
      resourceId: unpublished.id,
      target,
      summary: `Unpublished category "${target}"`,
    });
    return adminJson(c, unpublished);
  });
