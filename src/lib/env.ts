// Public (build-time) site config. Only non-sensitive public variables may use NEXT_PUBLIC_*.
export const env = {
  // The site's own public origin — canonical / OG / sitemap URLs.
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  // Public R2 bucket origin that product images are served from.
  r2PublicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '',
  // Turnstile widget (public) key for the contact form.
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '',
};
