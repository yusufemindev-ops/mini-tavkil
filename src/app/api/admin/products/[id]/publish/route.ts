import { adminRoute } from '@/lib/api/handler';
import { publishProduct } from '@/lib/services/products';

export const dynamic = 'force-dynamic';

export const POST = adminRoute<{ id: string }>('products:publish', async ({ params }) =>
  publishProduct(params.id),
);
