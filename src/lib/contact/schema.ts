import { z } from 'zod';
import { LOCALES } from '@/lib/services/catalog-schemas';

/**
 * The contact form's shape.
 *
 * The only public write on the site, so this is the only place an anonymous
 * visitor's input reaches the server at all. Everything is bounded: an unbounded
 * message field is a free way to make us relay megabytes into an inbox.
 *
 * Client-side validation is UX; this is the check that counts (PLAN.md §14h).
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(120),
  email: z.string().trim().email('Please enter a valid email address.').max(254),
  company: z.string().trim().max(160).optional().or(z.literal('')),
  message: z
    .string()
    .trim()
    .min(10, 'Please tell us a little more — at least 10 characters.')
    .max(4000, 'Please keep the message under 4000 characters.'),
  locale: z.enum(LOCALES).default('en'),
  /** Set when the enquiry came from a product page, so we know what they mean. */
  productSlug: z.string().trim().max(200).optional().or(z.literal('')),
  productName: z.string().trim().max(300).optional().or(z.literal('')),
  /** Cloudflare Turnstile response token. Verified server-side before anything else. */
  turnstileToken: z.string().trim().min(1, 'Please complete the verification.'),
});

export type ContactInput = z.infer<typeof contactSchema>;
