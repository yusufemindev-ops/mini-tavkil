import { COUNTRIES, countryName, type Country, type CountryLocale } from '@repo/countries';

export type CountrySelectVariant = 'country' | 'dial';

export interface CountryOption {
  country: Country;
  /** Text shown in the closed input. */
  label: string;
  /** Lower-cased country name — the haystack for the country variant's by-name search. */
  search: string;
}

/**
 * Build the option list for a given locale + variant. Pure so it can be unit
 * tested without rendering the combobox.
 */
export function buildCountryOptions(
  locale: CountryLocale,
  variant: CountrySelectVariant,
): CountryOption[] {
  return COUNTRIES.map((country) => {
    const name = countryName(country, locale);
    return {
      country,
      label: variant === 'dial' ? `${country.flag} ${country.dial}` : `${country.flag} ${name}`,
      // Country search is by name only; the dial variant searches the dial code
      // directly (see filterCountryOption), so the dial/ISO code is left out on
      // purpose — including them let numbers match a country name, which is
      // confusing in a name-search field.
      search: name.toLowerCase(),
    };
  });
}

/**
 * Whether a printable character may be typed into the search input. Dial is
 * numbers only; country is everything-but-numbers (letters, spaces, accents).
 * Keeps each picker's search input honest about what it filters on.
 */
export function isSearchCharAllowed(char: string, variant: CountrySelectVariant): boolean {
  const isDigit = /[0-9]/.test(char);
  return variant === 'dial' ? isDigit : !isDigit;
}

/**
 * Match an option against the combobox query.
 *
 * In `list` mode Base UI feeds the input's full text in as the query — and for
 * the dial variant that text carries a flag emoji + "+" prefix (e.g.
 * "🇹🇷 +966"). Comparing that raw string against the haystack never matches, and
 * because the residual "🇹🇷 +" also fails to match, the popup stayed stuck on
 * "No matches" until it was reopened. So for the dial variant we search by
 * digits only: strip every non-digit from both the query and the dial code,
 * and treat an empty query as "match everything".
 */
export function filterCountryOption(
  option: CountryOption,
  query: string,
  variant: CountrySelectVariant,
): boolean {
  if (variant === 'dial') {
    const digits = query.replace(/\D/g, '');
    return digits === '' || option.country.dial.replace(/\D/g, '').startsWith(digits);
  }
  return option.search.includes(query.toLowerCase());
}
