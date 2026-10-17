import { describe, expect, it } from 'vitest';
import { contactSchema } from './schema';

const valid = {
  name: 'Layla Haddad',
  email: 'layla@example.com',
  company: 'Haddad Trading',
  message: 'We are looking to source 500 units of the 5L multi-surface cleaner.',
  locale: 'en',
  turnstileToken: 'token-from-widget',
};

// The only public write on the site. Client-side validation is UX; this is the
// check that counts, so it is tested against what an abusive request looks like
// rather than only what a good one does.

describe('contact schema', () => {
  it('accepts a complete submission', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a submission with no company', () => {
    expect(contactSchema.safeParse({ ...valid, company: '' }).success).toBe(true);
    const { company: _company, ...withoutCompany } = valid;
    expect(contactSchema.safeParse(withoutCompany).success).toBe(true);
  });

  describe('rejects', () => {
    it('a missing captcha token — this is what makes the endpoint gated', () => {
      const { turnstileToken: _token, ...withoutToken } = valid;
      expect(contactSchema.safeParse(withoutToken).success).toBe(false);
      expect(contactSchema.safeParse({ ...valid, turnstileToken: '' }).success).toBe(false);
    });

    it('a malformed email', () => {
      for (const email of ['not-an-email', 'a@b', '@example.com', 'a@.com', '']) {
        expect(contactSchema.safeParse({ ...valid, email }).success).toBe(false);
      }
    });

    it('a one-character name', () => {
      expect(contactSchema.safeParse({ ...valid, name: 'A' }).success).toBe(false);
      expect(contactSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
    });

    it('a message too short to act on', () => {
      expect(contactSchema.safeParse({ ...valid, message: 'hi' }).success).toBe(false);
    });

    it('an unbounded message', () => {
      // An unbounded field is a free way to make us relay megabytes into an inbox.
      expect(contactSchema.safeParse({ ...valid, message: 'x'.repeat(4001) }).success).toBe(false);
      expect(contactSchema.safeParse({ ...valid, message: 'x'.repeat(4000) }).success).toBe(true);
    });

    it('an oversized name, email or company', () => {
      expect(contactSchema.safeParse({ ...valid, name: 'x'.repeat(121) }).success).toBe(false);
      expect(
        contactSchema.safeParse({ ...valid, email: `${'x'.repeat(250)}@example.com` }).success,
      ).toBe(false);
      expect(contactSchema.safeParse({ ...valid, company: 'x'.repeat(161) }).success).toBe(false);
    });

    it('an oversized product reference', () => {
      // These come from a query string an attacker controls.
      expect(contactSchema.safeParse({ ...valid, productSlug: 'x'.repeat(201) }).success).toBe(
        false,
      );
      expect(contactSchema.safeParse({ ...valid, productName: 'x'.repeat(301) }).success).toBe(
        false,
      );
    });

    it('a locale the site does not serve', () => {
      expect(contactSchema.safeParse({ ...valid, locale: 'de' }).success).toBe(false);
    });
  });

  it('trims whitespace so a spaces-only field cannot pass as content', () => {
    const parsed = contactSchema.parse({ ...valid, name: '  Layla Haddad  ' });
    expect(parsed.name).toBe('Layla Haddad');
  });

  it('defaults locale to en when absent', () => {
    const { locale: _locale, ...withoutLocale } = valid;
    expect(contactSchema.parse(withoutLocale).locale).toBe('en');
  });
});
