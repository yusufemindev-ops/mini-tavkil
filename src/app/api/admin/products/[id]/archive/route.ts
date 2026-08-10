import { adminRoute } from '@/lib/api/handler';
import { archiveProduct } from '@/lib/services/products';

export const dynamic = 'force-dynamic';

export const POST = adminRoute<{ id: string }>('products:delete', async ({ params }) =>
  archiveProduct(params.id),
);
