import { adminRoute } from '@/lib/api/handler';
import { adminListProductsSchema, createProductSchema } from '@/lib/services/catalog-schemas';
import { createProduct, listProducts } from '@/lib/services/products';

export const dynamic = 'force-dynamic';

export const GET = adminRoute('products:view', async ({ request }) => {
  const query = adminListProductsSchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  return listProducts(query);
});

export const POST = adminRoute('products:create', createProductSchema, async ({ body, admin }) =>
  createProduct(body, admin.id),
);
