// Turn a backend `localizedSlugs` map ({ en: 'bath-towels', tr: '…' }) into
// locale-prefix-less paths ({ en: '/catalogue/bath-towels', tr: '/catalogue/…' })
// for <RegisterLocalizedPaths>, so the language switcher navigates to each
// locale's own URL. `base` is the route prefix, e.g. '/catalogue' or '/product'.
export function localizedPathMap(
  base: string,
  slugs: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [locale, slug] of Object.entries(slugs)) {
    if (slug) out[locale] = `${base}/${slug}`;
  }
  return out;
}

// Decode a route slug. Next.js 16 hands a dynamic segment to the page and to
// generateMetadata with DIFFERENT encoding — one decoded, one still
// percent-encoded (`%D9%85…` for a non-Latin slug). Decoding here makes both
// paths agree. Safe/idempotent: an already-decoded slug has no `%` sequences, so
// it's returned unchanged; malformed input falls back to the original.
export function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

// Find the entity whose slug matches `slug`, comparing on the display slug OR any
// of its localized slugs. Both sides are NFC-normalized: a browser normalizes a
// non-Latin URL path (e.g. an Arabic slug) to NFC, but the stored slug may be
// NFD, so a raw `===` misses on visually-identical text and 404s. Matching the
// localizedSlugs map also handles a locale whose translation isn't complete (it's
// served under the English display slug but must resolve at its own URL).
export function matchLocalizedSlug<
  T extends { slug: string; localizedSlugs?: Record<string, string> },
>(items: readonly T[], slug: string): T | undefined {
  const target = slug.normalize('NFC');
  return items.find(
    (c) =>
      c.slug.normalize('NFC') === target ||
      Object.values(c.localizedSlugs ?? {}).some((s) => s.normalize('NFC') === target),
  );
}
