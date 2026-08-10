// Public (build-time) site config. Next.js inlines NEXT_PUBLIC_* values at build,
// so this module is the single place the dev defaults live — set the real values
// in .env for production. Don't read process.env.NEXT_PUBLIC_* elsewhere.
//
// Only three NEXT_PUBLIC_* vars exist and all three are meant to be public: the
// site origin, the R2 public bucket origin, and the Turnstile *site* key. Nothing
// else may ever get that prefix — see PLAN.md §14h.

export const env = {
  // The site's own public origin — canonical / OG / sitemap URLs.
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  // Public R2 bucket origin that product images are served from.
  r2PublicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '',
  // Turnstile widget (public) key for the contact form.
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '',
};
