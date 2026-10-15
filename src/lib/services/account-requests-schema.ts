import { z } from 'zod';

export const approveAccountRequestSchema = z.object({
  tierMarkup: z.number().min(0).max(100).optional(),
});

export type ApproveAccountRequestInput = z.infer<typeof approveAccountRequestSchema>;

export const rejectAccountRequestSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type RejectAccountRequestInput = z.infer<typeof rejectAccountRequestSchema>;
