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

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  'burnermail.io',
  'discard.email',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'grr.la',
  'guerrillamail.biz',
  'guerrillamail.com',
  'guerrillamail.de',
  'guerrillamail.info',
  'guerrillamail.net',
  'guerrillamail.org',
  'harakirimail.com',
  'inboxbear.com',
  'jetable.org',
  'mailcatch.com',
  'maildrop.cc',
  'mailinator.com',
  'mailnesia.com',
  'mailnull.com',
  'mailsac.com',
  'mintemail.com',
  'mohmal.com',
  'mytemp.email',
  'nada.email',
  'sharklasers.com',
  'spam4.me',
  'spamgourmet.com',
  'temp-mail.io',
  'temp-mail.org',
  'tempail.com',
  'tempmail.com',
  'tempmail.de',
  'tempmail.net',
  'tempmail.org',
  'tempmailaddress.com',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
]);

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf('@');
  if (at === -1) return false;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  if (!domain) return false;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  for (const blocked of DISPOSABLE_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

export const submitAccountRequestSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(80),
  lastName: z.string().trim().min(1, 'Last name is required.').max(80),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .max(254)
    .refine(
      (val) => !isDisposableEmail(val),
      'Disposable email addresses are not accepted. Please use your business email.',
    ),
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
