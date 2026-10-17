import { describe, expect, it } from 'vitest';
import {
  listProfileEditRequestsQuerySchema,
  rejectProfileEditRequestSchema,
  submitProfileEditRequestSchema,
} from './profile-edit-requests-schema';

describe('submitProfileEditRequestSchema', () => {
  it('validates and normalizes a valid profile edit request', () => {
    const parsed = submitProfileEditRequestSchema.parse({
      firstName: '  Ahmet ',
      lastName: ' Yılmaz ',
      company: ' Anadolu Industrial ',
      phone: '+90 532 000 0000',
      jobTitle: 'Procurement Director',
      country: 'tr',
      city: 'Istanbul',
      address: 'Levent Mah.',
    });

    expect(parsed).toEqual({
      firstName: 'Ahmet',
      lastName: 'Yılmaz',
      company: 'Anadolu Industrial',
      phone: '+90 532 000 0000',
      jobTitle: 'Procurement Director',
      country: 'TR',
      city: 'Istanbul',
      address: 'Levent Mah.',
    });
  });

  it('rejects empty firstName or non-ISO-2 country', () => {
    expect(() =>
      submitProfileEditRequestSchema.parse({
        firstName: '   ',
        lastName: 'Yılmaz',
        country: 'TR',
      }),
    ).toThrow();

    expect(() =>
      submitProfileEditRequestSchema.parse({
        firstName: 'Ahmet',
        lastName: 'Yılmaz',
        country: 'TUR',
      }),
    ).toThrow();
  });
});

describe('listProfileEditRequestsQuerySchema', () => {
  it('defaults status to pending and allows rejected', () => {
    expect(listProfileEditRequestsQuerySchema.parse({})).toEqual({ status: 'pending' });
    expect(listProfileEditRequestsQuerySchema.parse({ status: 'rejected' })).toEqual({
      status: 'rejected',
    });
  });
});

describe('rejectProfileEditRequestSchema', () => {
  it('trims optional rejection reason', () => {
    expect(rejectProfileEditRequestSchema.parse({ reason: '  Invalid tax office  ' })).toEqual({
      reason: 'Invalid tax office',
    });
    expect(rejectProfileEditRequestSchema.parse({})).toEqual({});
  });
});
