import { COUNTRIES } from '@repo/countries';

// Shared phone helpers for forms that store a dial-coded phone string (so
// WhatsApp deep links work). Mirrors the buyer pages' inline logic, centralized
// here for suppliers (and future) to reuse.

// Combine a dial code (e.g. "+90") with a national number, avoiding a doubled
// country code when the operator typed / pasted an international prefix.
// Returns '' when there's no national number so callers can store null.
export function buildPhone(dial: string, national: string): string {
  const n = national.trim();
  if (n.length === 0) return '';
  if (n.startsWith('+')) return n;
  if (n.startsWith('00')) return `+${n.slice(2).trim()}`;
  return `${dial} ${n}`.trim();
}

// Parse a stored dial-coded value back into picker state. Matches the COUNTRY
// whose dial digits are the longest prefix of the stored digits (so e.g.
// "+35818…" → AX beats FI's "+358"). Falls back to TR for empty / no match.
export function splitPhone(stored: string | null | undefined): {
  countryCode: string;
  number: string;
} {
  const digits = (stored ?? '').replace(/\D/g, '');
  if (digits.length === 0) return { countryCode: 'TR', number: '' };

  let best: { code: string; dialLen: number } | null = null;
  for (const c of COUNTRIES) {
    const dialDigits = c.dial.replace(/\D/g, '');
    if (dialDigits.length === 0) continue;
    if (!digits.startsWith(dialDigits)) continue;
    if (best === null || dialDigits.length > best.dialLen) {
      best = { code: c.code, dialLen: dialDigits.length };
    }
  }

  if (best === null) return { countryCode: 'TR', number: '' };
  return { countryCode: best.code, number: digits.slice(best.dialLen) };
}

// wa.me needs digits only (no +, spaces, or punctuation).
export function waHref(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}
