import slugify from 'slugify';

// Preserves native Arabic script by identity-mapping Arabic Unicode blocks in slugify charmap.
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

// Strips symbols and punctuation while preserving unicode letters and numbers.
const REMOVE_PATTERN = /[^\p{L}\p{N}\s-]/gu;

/** Converts a human-readable title into a clean URL slug preserving Arabic characters. */
export function toSlug(input: string): string {
  if (!input) return '';
  return slugify(input, {
    lower: true,
    trim: true,
    strict: false,
    remove: REMOVE_PATTERN,
  });
}

/** Live slug formatter for input fields, preserving trailing hyphens during typing. */
export function toSlugLive(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(REMOVE_PATTERN, '')
    .replace(/\s+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-/u, '');
}
