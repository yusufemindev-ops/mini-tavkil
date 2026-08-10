import { describe, expect, it } from 'vitest';
import ar from '../../messages/ar.json';
import en from '../../messages/en.json';
import tr from '../../messages/tr.json';
import { routing } from './routing';

// A missing key in one locale is invisible until someone browses that locale and
// sees a raw key path where a sentence should be — so the parity check is a test,
// not a review item. English is the reference set because it's the default locale.
function flatten(value: unknown, prefix = ''): Set<string> {
  const keys = new Set<string>();
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (child && typeof child === 'object' && !Array.isArray(child)) {
        for (const nested of flatten(child, `${prefix}${key}.`)) keys.add(nested);
      } else {
        keys.add(`${prefix}${key}`);
      }
    }
  }
  return keys;
}

const messages: Record<string, unknown> = { en, tr, ar };

describe('message catalogues', () => {
  it('covers every configured locale', () => {
    expect(Object.keys(messages).sort()).toEqual([...routing.locales].sort());
  });

  const reference = flatten(en);

  it.each(['tr', 'ar'])('%s has exactly the same keys as en', (locale) => {
    const actual = flatten(messages[locale]);
    expect([...reference].filter((k) => !actual.has(k)).sort()).toEqual([]);
    expect([...actual].filter((k) => !reference.has(k)).sort()).toEqual([]);
  });

  it.each(['en', 'tr', 'ar'])('%s has no empty strings', (locale) => {
    const empty: string[] = [];
    const walk = (value: unknown, prefix = '') => {
      if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
          if (typeof child === 'string') {
            if (child.trim() === '') empty.push(`${prefix}${key}`);
          } else {
            walk(child, `${prefix}${key}.`);
          }
        }
      }
    };
    walk(messages[locale]);
    expect(empty).toEqual([]);
  });

  it('no longer carries the buyer-account namespace', () => {
    // There is no buyer sign-in here (PLAN.md §3). Keeping the strings around
    // invites someone to render them.
    for (const locale of Object.keys(messages)) {
      expect(messages[locale]).not.toHaveProperty('account');
    }
  });
});
