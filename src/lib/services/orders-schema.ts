import { z } from 'zod';

export const ORDER_STATUSES = [
  'submitted',
  'confirmed',
  'accepted',
  'rejected',
  'expired',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const listAdminOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(ORDER_STATUSES).optional(),
  buyerId: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
});

export type ListAdminOrdersQuery = z.infer<typeof listAdminOrdersSchema>;

export const confirmOrderSchema = z.object({
  markupPercent: z.number().min(0).max(500).optional(),
  adminNote: z.string().trim().max(2000).nullable().optional(),
  itemOverrides: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        unitPriceFinal: z.number().min(0),
      }),
    )
    .max(500)
    .optional(),
});

export type ConfirmOrderInput = z.infer<typeof confirmOrderSchema>;

export const rejectOrderSchema = z.object({
  reason: z.string().trim().max(2000).nullable().optional(),
});

export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;

export const assignOrderSchema = z.object({
  assignedUserId: z.string().trim().min(1).nullable(),
});

export type AssignOrderInput = z.infer<typeof assignOrderSchema>;

export const listBuyerOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(ORDER_STATUSES).optional(),
});

export type ListBuyerOrdersQuery = z.infer<typeof listBuyerOrdersQuerySchema>;

export const submitBuyerOrderSchema = z.object({
  locale: z.enum(['en', 'tr', 'ar']).default('en'),
  notes: z.string().trim().max(2000).nullable().optional(),
  items: z
    .array(
      z.object({
        sku: z.string().trim().min(1),
        quantity: z.number().int().min(1).max(1_000_000),
        options: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(120),
              value: z.string().trim().min(1).max(200),
            }),
          )
          .max(20)
          .optional(),
      }),
    )
    .min(1, 'Add at least one item to submit an order request.')
    .max(200),
});

export type SubmitBuyerOrderInput = z.infer<typeof submitBuyerOrderSchema>;
