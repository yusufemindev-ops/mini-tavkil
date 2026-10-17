import { describe, expect, it } from 'vitest';
import { waUrl } from './settings';

/**
 * The WhatsApp button is the shortest path a buyer has to a conversation, and a
 * wrong link fails silently — it looks like a working button right up until
 * someone presses it and lands on a wa.me page that cannot resolve the number.
 */
describe('waUrl', () => {
  it('strips the 00 international access prefix', () => {
    // The real number as saved in settings. `00` is what a person dials to get
    // an outside line; wa.me wants country code + subscriber number only.
    expect(waUrl('00905333922089')).toBe('https://wa.me/905333922089');
  });

  it('accepts the number in the shapes people actually paste', () => {
    for (const input of ['+90 533 392 20 89', '905333922089', '+905333922089', '0090 533 392 2089'])
      expect(waUrl(input), input).toBe('https://wa.me/905333922089');
  });

  it('is empty when no number is configured, so the button hides instead of breaking', () => {
    expect(waUrl('')).toBe('');
    expect(waUrl('   ')).toBe('');
    // Punctuation with no digits is still nothing to call.
    expect(waUrl('+-()')).toBe('');
  });

  it('prefills a message when there is product context', () => {
    expect(waUrl('905333922089', 'This enquiry is about: Almond Mop')).toBe(
      'https://wa.me/905333922089?text=This%20enquiry%20is%20about%3A%20Almond%20Mop',
    );
  });

  it('encodes Arabic prefill text rather than emitting a broken URL', () => {
    const url = waUrl('905333922089', 'ممسحة لوزية');
    expect(url.startsWith('https://wa.me/905333922089?text=%')).toBe(true);
    expect(decodeURIComponent(url.split('text=')[1])).toBe('ممسحة لوزية');
  });

  it('adds no query at all when there is nothing to prefill', () => {
    expect(waUrl('905333922089')).toBe('https://wa.me/905333922089');
  });
});
