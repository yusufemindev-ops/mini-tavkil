import { adminRoute } from '@/lib/api/handler';
import {
  deleteSupplier,
  getSupplier,
  updateSupplier,
  updateSupplierSchema,
  type UpdateSupplierInput,
} from '@/lib/services/suppliers';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export const GET = adminRoute<Params>('suppliers:view', async ({ params }) =>
  getSupplier(params.id),
);

export const PATCH = adminRoute<Params, UpdateSupplierInput>(
  'suppliers:edit',
  updateSupplierSchema,
  async ({ params, body }) => updateSupplier(params.id, body),
);

export const DELETE = adminRoute<Params>('suppliers:delete', async ({ params }) =>
  deleteSupplier(params.id),
);
