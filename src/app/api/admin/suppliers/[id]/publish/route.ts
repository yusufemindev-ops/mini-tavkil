import { adminRoute } from '@/lib/api/handler';
import { publishSupplier } from '@/lib/services/suppliers';

export const dynamic = 'force-dynamic';

export const POST = adminRoute<{ id: string }>('suppliers:publish', async ({ params }) =>
  publishSupplier(params.id),
);
