import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Wires the request config that resolves the locale and loads messages/*.json.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Security headers (PLAN.md §14h).
 *
 * The CSP is the one with teeth. Notes on the choices that aren't obvious:
 *
 * - **No `unsafe-eval`.** Next doesn't need it in production, and it's the single
 *   directive that turns an injected string into running code.
 * - `'unsafe-inline'` for scripts is still required: Next inlines its bootstrap
 *   and RSC payload, and next-themes writes an inline no-flash script. Moving to
 *   a nonce means a per-request CSP header, which conflicts with caching every
 *   public page — a real trade-off, deliberately taken.
 * - `frame-ancestors 'none'` does the job `X-Frame-Options: DENY` used to, but
 *   both are sent because some scanners still look for the older header.
 * - `img-src` is the tight one asked for: self plus the R2 host, and nothing
 *   else. `placehold.co` used to be allowed for the seeded catalogue; the seed
 *   now carries real photography in R2, so the exception is gone.
 */
function contentSecurityPolicy(): string {
  const r2 = r2Host();
  const turnstile = 'https://challenges.cloudflare.com';
  const maps = 'https://www.google.com';

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${turnstile}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${r2}`,
    "font-src 'self' data:",
    `connect-src 'self' ${turnstile}`,
    // Turnstile renders in a frame; the contact page embeds a Google Map.
    `frame-src ${turnstile} ${maps}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ]
    .filter(Boolean)
    .join('; ');
}

function r2Host(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').origin;
  } catch {
    return '';
  }
}

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
  // Two years, preload-eligible. Only meaningful once the custom domain is live;
  // harmless on workers.dev, which is HTTPS-only anyway.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // No cross-origin consumer exists, so nothing needs to embed or read us.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },

  images: {
    // Product images are served from the public R2 bucket. NEXT_PUBLIC_R2_PUBLIC_URL
    // is a full origin, so derive the hostname rather than hardcoding r2.dev —
    // step 15 swaps it for images.tavkil.com and this then follows.
    remotePatterns: r2RemotePattern(),
  },
};

function r2RemotePattern() {
  const raw = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!raw) return [];
  try {
    const { protocol, hostname } = new URL(raw);
    return [{ protocol: protocol.replace(':', '') as 'http' | 'https', hostname }];
  } catch {
    return [];
  }
}

export default withNextIntl(nextConfig);

// Gives `next dev` access to the Worker bindings (R2, etc.) declared in
// wrangler.jsonc, so local dev exercises the same bindings production does.
void initOpenNextCloudflareForDev();
