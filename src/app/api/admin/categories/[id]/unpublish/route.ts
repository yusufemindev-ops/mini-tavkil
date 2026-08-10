import { adminRoute } from '@/lib/api/handler';
import { unpublishCategory } from '@/lib/services/categories';

export const dynamic = 'force-dynamic';

export const POST = adminRoute<{ id: string }>('categories:publish', async ({ params }) =>
  unpublishCategory(params.id),
);
