import { adminRoute } from '@/lib/api/handler';
import { updateProductSchema, type UpdateProductInput } from '@/lib/services/catalog-schemas';
import { deleteProduct, getProduct, updateProduct } from '@/lib/services/products';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export const GET = adminRoute<Params>('products:view', async ({ params }) => getProduct(params.id));

export const PATCH = adminRoute<Params, UpdateProductInput>(
  'products:edit',
  updateProductSchema,
  async ({ params, body, admin }) => updateProduct(params.id, body, admin.id),
);

export const DELETE = adminRoute<Params>('products:delete', async ({ params }) =>
  deleteProduct(params.id),
);
