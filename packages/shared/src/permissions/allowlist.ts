/**
 * Who is allowed into the admin.
 *
 * Its own module, importing nothing, for the same reason `product-sort` is: the
 * moment a policy helper lives in a file that imports `@/lib/db`, testing it (or
 * referencing it from a Client Component) drags Drizzle, the schema, and a
 * module-scope `throw new Error('DATABASE_URL is not set')` along with it.
 */

/**
 * Addresses from `ADMIN_ALLOWLIST`, comma-separated, lowercased and trimmed.
 *
 * An empty or unset list denies everyone. That is deliberate: the alternative —
 * treating "unset" as "anyone with a Google account" — turns one missing config
 * line into a breach.
 */
export function adminAllowlist(): string[] {
  return (process.env.ADMIN_ALLOWLIST ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminAllowlist().includes(email.trim().toLowerCase());
}
