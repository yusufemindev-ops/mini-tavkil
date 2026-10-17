import { z } from 'zod';

export const PROFILE_EDIT_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ProfileEditStatus = (typeof PROFILE_EDIT_STATUSES)[number];

export const submitProfileEditRequestSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  company: z.string().trim().max(200).nullish(),
  phone: z.string().trim().max(50).nullish(),
  jobTitle: z.string().trim().max(150).nullish(),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase()),
  city: z.string().trim().max(120).nullish(),
  address: z.string().trim().max(500).nullish(),
});

export type SubmitProfileEditRequestInput = z.infer<typeof submitProfileEditRequestSchema>;

export const listProfileEditRequestsQuerySchema = z.object({
  status: z.enum(['pending', 'rejected']).default('pending'),
});

export const rejectProfileEditRequestSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
