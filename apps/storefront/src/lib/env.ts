function resolveApiOrigin(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
  if (configured) return configured;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'dev.tavkil.com') return 'https://api-dev.tavkil.com';
    if (host === 'tavkil.com' || host === 'www.tavkil.com') return 'https://api.tavkil.com';
  }
  return '';
}

export const env = {
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  r2PublicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '',
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '',
  get apiOrigin(): string {
    return resolveApiOrigin();
  },
};

/** Resolves a storefront `/api/...` path against the API origin (or same-origin in local dev). */
export function apiUrl(path: string): string {
  return `${resolveApiOrigin()}${path}`;
}
