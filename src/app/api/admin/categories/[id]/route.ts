import { adminRoute } from '@/lib/api/handler';
import { updateCategorySchema, type UpdateCategoryInput } from '@/lib/services/catalog-schemas';
import { deleteCategory, getCategory, updateCategory } from '@/lib/services/categories';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export const GET = adminRoute<Params>('categories:view', async ({ params }) =>
  getCategory(params.id),
);

export const PATCH = adminRoute<Params, UpdateCategoryInput>(
  'categories:edit',
  updateCategorySchema,
  async ({ params, body }) => updateCategory(params.id, body),
);

export const DELETE = adminRoute<Params>('categories:delete', async ({ params }) =>
  deleteCategory(params.id),
);
