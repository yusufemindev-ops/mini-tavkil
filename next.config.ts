import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Wires the request config that resolves the locale and loads messages/*.json.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  /**
   * SPA fallback for the admin.
   *
   * The admin is a Vite single-page app built into `public/admin`, so a deep link
   * like /admin/products/<id> has no file on disk — the router resolves it in the
   * browser. `afterFiles` is the right hook precisely because it runs *after*
   * static files are matched: real assets under /admin/assets/* are served
   * normally, and only what is left over falls through to the shell.
   *
   * `beforeFiles` would have swallowed the asset requests too, and served
   * index.html for every stylesheet.
   */
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: '/admin', destination: '/admin/index.html' },
        { source: '/admin/:path*', destination: '/admin/index.html' },
      ],
      fallback: [],
    };
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
