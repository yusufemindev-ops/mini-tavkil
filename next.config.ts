import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Wires the request config that resolves the locale and loads messages/*.json.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Security headers: tight CSP (disables unsafe-eval in prod), frame denial,
 * and scoped image sources for R2 and integrations.
 */
function contentSecurityPolicy(): string {
  const r2 = r2Host();
  const turnstile = 'https://challenges.cloudflare.com';
  const maps = 'https://www.google.com';
  // React dev overlay requires eval for stack traces; omitted in production.
  const evalForReactDev = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'";
  // Omit upgrade-insecure-requests when testing over plain http on localhost.
  const upgradeInsecure = process.env.NEXT_PUBLIC_SITE_URL?.startsWith('http://')
    ? ''
    : 'upgrade-insecure-requests';

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${evalForReactDev} ${turnstile}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${r2}`,
    "font-src 'self' data:",
    `connect-src 'self' ${turnstile}`,
    // Allowed frames for Turnstile captcha and Google Maps contact embed.
    `frame-src ${turnstile} ${maps}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    upgradeInsecure,
  ]
    .filter(Boolean)
    .join('; ');
}

function r2Host(): string {
  const hosts = new Set<string>(['https://images.tavkil.com']);
  try {
    const configured = new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').origin;
    if (configured) hosts.add(configured);
  } catch {
    // Ignore empty or invalid URL.
  }
  return [...hosts].join(' ');
}

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },

  images: {
    // Allow product image optimization from the configured R2 public bucket origin.
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

// Expose Cloudflare Worker bindings (R2, etc.) to local next dev environment.
if (process.env.NODE_ENV === 'development') {
  void initOpenNextCloudflareForDev();
}
