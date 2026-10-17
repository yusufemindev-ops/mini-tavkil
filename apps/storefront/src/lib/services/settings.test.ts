import { describe, expect, it } from 'vitest';
import { generalSettingsSchema, updateSettingsSchema } from './settings-schema';

const valid = {
  siteName: 'Tavkil',
  logoUrl: '',
  ogImageUrl: '',
  whatsappNumber: '+90 555 000 0000',
  contactEmail: 'hello@tavkil.com',
  address: 'İzmir, Türkiye',
  mapsEmbedUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  facebookUrl: '',
  inquiryEmail: 'sales@tavkil.com',
};

describe('settings schema', () => {
  it('accepts a fully populated blob', () => {
    expect(generalSettingsSchema.safeParse(valid).success).toBe(true);
  });

  it('treats an empty string as "unset" for optional URLs', () => {
    // Every caller hides its UI on an empty string, so blank must be valid —
    // otherwise a site with no Instagram could never save its settings.
    expect(generalSettingsSchema.safeParse({ ...valid, instagramUrl: '' }).success).toBe(true);
    expect(generalSettingsSchema.safeParse({ ...valid, contactEmail: '' }).success).toBe(true);
  });

  it('rejects a malformed URL that is not empty', () => {
    expect(generalSettingsSchema.safeParse({ ...valid, instagramUrl: 'not a url' }).success).toBe(
      false,
    );
  });

  describe('maps embed', () => {
    it('accepts an official Google Maps embed URL', () => {
      const url = 'https://www.google.com/maps/embed?pb=!1m18!1m12';
      expect(generalSettingsSchema.safeParse({ ...valid, mapsEmbedUrl: url }).success).toBe(true);
    });

    it('accepts blank', () => {
      expect(generalSettingsSchema.safeParse({ ...valid, mapsEmbedUrl: '' }).success).toBe(true);
    });

    it.each([
      ['a non-Google host', 'https://evil.example/maps/embed?pb=1'],
      ['a Google page that is not the embed endpoint', 'https://www.google.com/search?q=x'],
      ['a lookalike host', 'https://www.google.com.evil.test/maps/embed'],
      ['javascript:', 'javascript:alert(1)'],
      ['a data URL', 'data:text/html,<script>alert(1)</script>'],
    ])('rejects %s', (_label, url) => {
      // The contact page drops this straight into an <iframe src>. Anything that
      // is not the official embed endpoint is an arbitrary frame on our origin.
      expect(generalSettingsSchema.safeParse({ ...valid, mapsEmbedUrl: url }).success).toBe(false);
    });
  });

  it('requires a site name', () => {
    expect(generalSettingsSchema.safeParse({ ...valid, siteName: '   ' }).success).toBe(false);
  });

  it('allows a partial update', () => {
    // PATCH merges over what is stored, so sending one field must be valid.
    expect(updateSettingsSchema.safeParse({ siteName: 'New name' }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({}).success).toBe(true);
  });

  it('still validates the fields a partial update does send', () => {
    expect(updateSettingsSchema.safeParse({ mapsEmbedUrl: 'https://evil.example' }).success).toBe(
      false,
    );
  });
});
