import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Wires the request config that resolves the locale and loads messages/*.json.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
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
