import { adminRoute } from '@/lib/api/handler';
import { createSupplier, createSupplierSchema, listSuppliers } from '@/lib/services/suppliers';

// Admin-only, all of it. Suppliers have no public route and never will —
// a supplier name on an anonymous response is the leak this project prevents.
export const dynamic = 'force-dynamic';

export const GET = adminRoute('suppliers:view', async () => listSuppliers());

export const POST = adminRoute('suppliers:create', createSupplierSchema, async ({ body }) =>
  createSupplier(body),
);
