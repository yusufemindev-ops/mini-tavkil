import { env } from '@/lib/env';

/**
 * Resolves a stored image reference to a public URL.
 *
 * Uploads store a **bare R2 key** (`products/<uuid>.webp`), not an absolute URL.
 * That is the whole point: step 15 swaps `NEXT_PUBLIC_R2_PUBLIC_URL` from the
 * r2.dev address to `images.tavkil.com`, and if absolute URLs were in the database
 * that swap would need a migration over every row. With keys it needs nothing.
 *
 * Absolute URLs still pass through unchanged, because the seeded catalogue holds
 * some and an admin may paste one.
 */
export function resolveImageUrl(reference: string): string {
  if (!reference) return '';
  if (/^https?:\/\//i.test(reference) || reference.startsWith('data:')) return reference;
  const base = env.r2PublicUrl.replace(/\/+$/, '');
  if (!base) return reference;
  return `${base}/${reference.replace(/^\/+/, '')}`;
}
