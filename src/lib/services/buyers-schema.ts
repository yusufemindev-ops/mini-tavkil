import { z } from 'zod';

export const createBuyerSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(255),
  firstName: z.string().trim().min(1, 'First name is required.').max(80),
  lastName: z.string().trim().min(1, 'Last name is required.').max(80),
  phone: z.string().trim().min(1, 'Phone number is required.').max(40),
  country: z.string().trim().length(2, 'Select a valid 2-letter country code.').toUpperCase(),
  companyName: z.string().trim().max(160).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  address: z.string().trim().max(300).optional(),
  tierMarkup: z.number().min(0).max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type CreateBuyerInput = z.infer<typeof createBuyerSchema>;

export const updateBuyerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(80).optional(),
  lastName: z.string().trim().min(1, 'Last name is required.').max(80).optional(),
  company: z.string().trim().max(160).nullable().optional(),
  jobTitle: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  country: z
    .string()
    .trim()
    .length(2, 'Select a valid 2-letter country code.')
    .toUpperCase()
    .optional(),
  city: z.string().trim().max(120).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  tierMarkup: z.number().min(0).max(100).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export type UpdateBuyerInput = z.infer<typeof updateBuyerSchema>;
