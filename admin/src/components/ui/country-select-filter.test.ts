import { describe, expect, it } from 'vitest';
import {
  buildCountryOptions,
  filterCountryOption,
  isSearchCharAllowed,
} from './country-select-filter';

const optsDial = buildCountryOptions('en', 'dial');
const optsCountry = buildCountryOptions('en', 'country');

const opt = (code: string, variant: 'dial' | 'country') => {
  const list = variant === 'dial' ? optsDial : optsCountry;
  const found = list.find((o) => o.country.code === code);
  if (!found) throw new Error(`no option for ${code}`);
  return found;
};

const sa = () => opt('SA', 'dial'); // Saudi Arabia, +966

const matches = (variant: 'dial' | 'country', query: string) =>
  (variant === 'dial' ? optsDial : optsCountry)
    .filter((o) => filterCountryOption(o, query, variant))
    .map((o) => o.country.code);

describe('buildCountryOptions', () => {
  it('builds a dial label as "flag +dial" and a country label as "flag name"', () => {
    expect(sa().label).toBe('🇸🇦 +966');
    expect(opt('SA', 'country').label).toBe('🇸🇦 Saudi Arabia');
  });

  it('uses the lower-cased country name as the search haystack (name only)', () => {
    expect(sa().search).toBe('saudi arabia');
  });
});

describe('filterCountryOption — dial variant (search by number)', () => {
  it('matches Saudi Arabia when typing the full dial code', () => {
    expect(filterCountryOption(sa(), '966', 'dial')).toBe(true);
    expect(matches('dial', '966')).toContain('SA');
  });

  it('matches even when the query carries the flag + "+" prefix (the reported bug)', () => {
    // What Base UI actually feeds in once "+90" is edited to "+966".
    expect(filterCountryOption(sa(), '🇹🇷 +966', 'dial')).toBe(true);
  });

  it('treats an empty / "+"-only / flag-only query as "match everything" (no stale No matches)', () => {
    expect(filterCountryOption(sa(), '', 'dial')).toBe(true);
    expect(filterCountryOption(sa(), '+', 'dial')).toBe(true);
    expect(filterCountryOption(sa(), '🇹🇷 +', 'dial')).toBe(true);
    // every option survives an empty query
    expect(matches('dial', '🇹🇷 +')).toHaveLength(optsDial.length);
  });

  it('matches by dial-code prefix', () => {
    const nineNine = matches('dial', '9');
    expect(nineNine).toContain('SA'); // +966
    expect(nineNine).toContain('TR'); // +90
    expect(nineNine).not.toContain('US'); // +1
  });

  it('ignores letters — the dial list is searched by number only', () => {
    // A name query has no digits, so it does not narrow the list to that
    // country; it falls back to "match everything" instead of filtering by name.
    expect(matches('dial', 'saudi')).toHaveLength(optsDial.length);
    expect(matches('dial', 'turkiye')).toHaveLength(optsDial.length);
  });
});

describe('filterCountryOption — country variant (search by name)', () => {
  it('matches by name, case-insensitively', () => {
    expect(filterCountryOption(opt('SA', 'country'), 'Saudi', 'country')).toBe(true);
    expect(matches('country', 'saudi')).toContain('SA');
  });

  it('does NOT match by dial code or ISO code (name search only)', () => {
    expect(filterCountryOption(opt('SA', 'country'), '966', 'country')).toBe(false);
    expect(matches('country', '966')).toHaveLength(0);
  });

  it('returns no matches for an unknown query', () => {
    expect(matches('country', 'zzzzz')).toHaveLength(0);
  });
});

describe('isSearchCharAllowed', () => {
  it('dial variant allows digits only', () => {
    expect(isSearchCharAllowed('9', 'dial')).toBe(true);
    expect(isSearchCharAllowed('a', 'dial')).toBe(false);
    expect(isSearchCharAllowed('+', 'dial')).toBe(false);
    expect(isSearchCharAllowed(' ', 'dial')).toBe(false);
  });

  it('country variant allows everything except digits', () => {
    expect(isSearchCharAllowed('a', 'country')).toBe(true);
    expect(isSearchCharAllowed(' ', 'country')).toBe(true);
    expect(isSearchCharAllowed('ã', 'country')).toBe(true);
    expect(isSearchCharAllowed('9', 'country')).toBe(false);
  });
});
