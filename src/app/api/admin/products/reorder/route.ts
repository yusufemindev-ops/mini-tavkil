import { adminRoute } from '@/lib/api/handler';
import { reorderProductsSchema } from '@/lib/services/catalog-schemas';
import { reorderProducts } from '@/lib/services/products';

export const dynamic = 'force-dynamic';

export const POST = adminRoute('products:edit', reorderProductsSchema, async ({ body }) =>
  reorderProducts(body.categoryId, body.ids),
);
