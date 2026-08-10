import slugify from 'slugify';

// slugify ships a transliteration charmap that turns Arabic letters into ASCII
// (e.g. "مضخة" → "mdhkhh"). For Tavkil we want Arabic slugs to KEEP their Arabic
// letters so the public URL reads naturally in Arabic. We can't disable
// transliteration per-script, so we override the charmap for the Arabic Unicode
// blocks with identity mappings — each Arabic codepoint maps to itself and is
// therefore left untouched. Latin/Turkish keep slugify's default ASCII
// transliteration ("Pompası" → "pompasi").
//
// The Arabic blocks we identity-map:
//   U+0600–U+06FF  Arabic
//   U+0750–U+077F  Arabic Supplement
//   U+08A0–U+08FF  Arabic Extended-A
//   U+FB50–U+FDFF  Arabic Presentation Forms-A
//   U+FE70–U+FEFF  Arabic Presentation Forms-B
const ARABIC_RANGES: readonly (readonly [number, number])[] = [
  [0x0600, 0x06ff],
  [0x0750, 0x077f],
  [0x08a0, 0x08ff],
  [0xfb50, 0xfdff],
  [0xfe70, 0xfeff],
];

const identityMap: Record<string, string> = {};
for (const [start, end] of ARABIC_RANGES) {
  for (let cp = start; cp <= end; cp++) {
    const ch = String.fromCodePoint(cp);
    identityMap[ch] = ch;
  }
}
slugify.extend(identityMap);

// Strip everything that isn't a unicode letter, a unicode number, whitespace, or
// a hyphen. Runs after slugify's per-char replacement, so Arabic punctuation that
// survived the identity map (e.g. "؟" U+061F, "،" U+060C) is removed here while
// Arabic letters are kept.
const REMOVE_PATTERN = /[^\p{L}\p{N}\s-]/gu;

/**
 * Turn a human-readable name into a URL slug.
 *
 * - Lowercased, trimmed, words joined by `-`.
 * - Latin/Turkish letters are ASCII-transliterated ("Su Pompası" → "su-pompasi").
 * - Arabic (and other non-Latin) letters are PRESERVED, not transliterated.
 * - Punctuation and symbols are stripped; unicode letters + numbers are kept.
 * - Empty / whitespace-only input yields an empty string.
 */
export function toSlug(input: string): string {
  if (!input) return '';
  return slugify(input, {
    lower: true,
    trim: true,
    strict: false,
    remove: REMOVE_PATTERN,
  });
}

/**
 * Typing-safe slug formatter for live `onChange` on a manual slug input.
 *
 * Unlike {@link toSlug}, this NEVER trims a trailing `-`. That lets the operator
 * keep typing across word boundaries: "test " → "test-", then "test here" →
 * "test-here". Trimming the trailing separator mid-type would glue words
 * together ("testhere"). Run {@link toSlug} on blur for the final tidy.
 *
 * - Lowercased.
 * - Keeps unicode letters (incl. Arabic) + numbers; strips everything else
 *   except whitespace and hyphens.
 * - Whitespace runs → a single `-`; repeated `-` collapsed; leading `-` stripped.
 */
export function toSlugLive(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(REMOVE_PATTERN, '')
    .replace(/\s+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-/u, '');
}
