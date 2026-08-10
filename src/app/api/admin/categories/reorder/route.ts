import { adminRoute } from '@/lib/api/handler';
import { reorderSchema } from '@/lib/services/catalog-schemas';
import { reorderCategories } from '@/lib/services/categories';

// A static segment, so it can never be shadowed by /[id] the way Nest's
// declaration-order rule required.
export const dynamic = 'force-dynamic';

export const POST = adminRoute('categories:edit', reorderSchema, async ({ body }) =>
  reorderCategories(body.ids),
);
