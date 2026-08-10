import { adminRoute } from '@/lib/api/handler';
import { unpublishSupplier } from '@/lib/services/suppliers';

export const dynamic = 'force-dynamic';

export const POST = adminRoute<{ id: string }>('suppliers:publish', async ({ params }) =>
  unpublishSupplier(params.id),
);
