import { describe, expect, it } from 'vitest';
import {
  approveAccountRequestSchema,
  isDisposableEmail,
  rejectAccountRequestSchema,
  submitAccountRequestSchema,
} from './account-requests-schema';
import { createBuyerSchema, updateBuyerSchema } from './buyers-schema';
import {
  assignOrderSchema,
  confirmOrderSchema,
  listAdminOrdersSchema,
  rejectOrderSchema,
} from './orders-schema';

describe('buyers-schema', () => {
  it('validates createBuyerSchema and normalizes country code to uppercase', () => {
    const parsed = createBuyerSchema.parse({
      email: ' buyer@company.com ',
      firstName: ' Ahmet ',
      lastName: ' Yilmaz ',
      phone: ' +90 532 000 0000 ',
      country: 'tr',
      companyName: ' Anatolia Ltd. ',
      tierMarkup: 15,
    });
    expect(parsed.email).toBe('buyer@company.com');
    expect(parsed.country).toBe('TR');
    expect(parsed.tierMarkup).toBe(15);
  });

  it('rejects out-of-range tierMarkup on updateBuyerSchema', () => {
    expect(() => updateBuyerSchema.parse({ tierMarkup: -5 })).toThrow();
    expect(() => updateBuyerSchema.parse({ tierMarkup: 150 })).toThrow();
    expect(updateBuyerSchema.parse({ tierMarkup: 22.5 }).tierMarkup).toBe(22.5);
  });
});

describe('account-requests-schema', () => {
  it('validates approveAccountRequestSchema and rejectAccountRequestSchema', () => {
    expect(approveAccountRequestSchema.parse({ tierMarkup: 12 })).toEqual({ tierMarkup: 12 });
    expect(rejectAccountRequestSchema.parse({ reason: ' Duplicate request ' })).toEqual({
      reason: 'Duplicate request',
    });
  });

  it('blocks disposable email domains and accepts business emails on submitAccountRequestSchema', () => {
    expect(isDisposableEmail('user@mailinator.com')).toBe(true);
    expect(isDisposableEmail('user@sub.10minutemail.com')).toBe(true);
    expect(isDisposableEmail('procurement@industrial-gmbh.de')).toBe(false);

    expect(() =>
      submitAccountRequestSchema.parse({
        firstName: 'Hans',
        lastName: 'Mueller',
        email: 'hans@mailinator.com',
        phone: '+49 170 1234567',
        company: 'Industrial GmbH',
        country: 'DE',
      }),
    ).toThrow(/Disposable email/);

    const valid = submitAccountRequestSchema.parse({
      firstName: 'Hans',
      lastName: 'Mueller',
      email: 'hans@industrial-gmbh.de',
      phone: '+49 170 1234567',
      company: 'Industrial GmbH',
      country: 'de',
    });
    expect(valid.country).toBe('DE');
  });
});

describe('orders-schema', () => {
  it('applies defaults on listAdminOrdersSchema', () => {
    const parsed = listAdminOrdersSchema.parse({});
    expect(parsed).toEqual({ page: 1, pageSize: 25 });
  });

  it('validates confirmOrderSchema itemOverrides and adminNote', () => {
    const itemId = '00000000-0000-4000-8000-000000000001';
    const parsed = confirmOrderSchema.parse({
      markupPercent: 18,
      adminNote: ' Quoted with volume discount ',
      itemOverrides: [{ itemId, unitPriceFinal: 118.5 }],
    });
    expect(parsed.markupPercent).toBe(18);
    expect(parsed.adminNote).toBe('Quoted with volume discount');
    expect(parsed.itemOverrides).toEqual([{ itemId, unitPriceFinal: 118.5 }]);
  });

  it('validates rejectOrderSchema and assignOrderSchema', () => {
    expect(rejectOrderSchema.parse({ reason: ' Out of stock ' })).toEqual({
      reason: 'Out of stock',
    });
    expect(assignOrderSchema.parse({ assignedUserId: null })).toEqual({
      assignedUserId: null,
    });
  });
});
