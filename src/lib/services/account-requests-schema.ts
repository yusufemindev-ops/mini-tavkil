import { z } from 'zod';

export const approveAccountRequestSchema = z.object({
  tierMarkup: z.number().min(0).max(100).optional(),
});

export type ApproveAccountRequestInput = z.infer<typeof approveAccountRequestSchema>;

export const rejectAccountRequestSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type RejectAccountRequestInput = z.infer<typeof rejectAccountRequestSchema>;

export const listAccountRequestsQuerySchema = z.object({
  status: z.enum(['pending', 'rejected']).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(500),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListAccountRequestsQuery = z.infer<typeof listAccountRequestsQuerySchema>;

export const submitAccountRequestSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(80),
  lastName: z.string().trim().min(1, 'Last name is required.').max(80),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  phone: z.string().trim().min(4, 'Phone number is required.').max(40),
  jobTitle: z.string().trim().max(120).optional().or(z.literal('')),
  company: z.string().trim().min(1, 'Company name is required.').max(160),
  country: z.string().trim().length(2, 'Select a valid 2-letter country code.').toUpperCase(),
  city: z.string().trim().max(120).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  locale: z.enum(['en', 'tr', 'ar']).default('en'),
  turnstileToken: z.string().trim().optional(),
});

export type SubmitAccountRequestInput = z.infer<typeof submitAccountRequestSchema>;
