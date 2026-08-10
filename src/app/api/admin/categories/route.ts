import { adminRoute } from '@/lib/api/handler';
import { createCategorySchema } from '@/lib/services/catalog-schemas';
import { createCategory, listCategories } from '@/lib/services/categories';

// Paths match Tavkil's exactly so the admin SPA needs no changes (PLAN.md §8).
export const dynamic = 'force-dynamic';

export const GET = adminRoute('categories:view', async () => listCategories());

export const POST = adminRoute('categories:create', createCategorySchema, async ({ body }) =>
  createCategory(body),
);
