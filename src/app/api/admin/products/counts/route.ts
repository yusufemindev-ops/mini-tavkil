import { adminRoute } from '@/lib/api/handler';
import { adminListProductsSchema } from '@/lib/services/catalog-schemas';
import { productStatusCounts } from '@/lib/services/products';

// Counts per status for the admin's filter tabs. Deliberately ignores the status
// filter, so the tabs show totals rather than "3 published" while on Published.
export const dynamic = 'force-dynamic';

export const GET = adminRoute('products:view', async ({ request }) => {
  const query = adminListProductsSchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  return productStatusCounts(query);
});
