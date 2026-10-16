import { describe, expect, it } from 'vitest';
import { toBuyerProfilePublic } from '@/lib/buyer-guard';
import {
  listAccountRequestsQuerySchema,
  submitAccountRequestSchema,
} from '@/lib/services/account-requests-schema';
import { listBuyersQuerySchema } from '@/lib/services/buyers-schema';
import { listBuyerOrdersQuerySchema, submitBuyerOrderSchema } from '@/lib/services/orders-schema';
import {
  listProfileEditRequestsQuerySchema,
  submitProfileEditRequestSchema,
} from '@/lib/services/profile-edit-requests-schema';

describe('buyer portal schemas & audience boundary guards', () => {
  it('strips tierMarkupPercent from BuyerProfilePublic', () => {
    const publicProfile = toBuyerProfilePublic({
      id: 'usr_123',
      email: 'buyer@acme.de',
      firstName: 'Hans',
      lastName: 'Gruber',
      contactName: 'Hans Gruber',
      companyName: 'Acme GmbH',
      jobTitle: 'Procurement Director',
      phone: '+49 170 1234567',
      country: 'DE',
      city: 'Berlin',
      address: 'Friedrichstr. 10',
      preferredLocale: 'en',
      verified: true,
      tierMarkupPercent: 18.5,
      memberSince: '2026-01-15T10:00:00.000Z',
    });

    const serialized = JSON.stringify(publicProfile);
    expect(serialized).not.toContain('tierMarkup');
    expect(serialized).not.toContain('tier_markup');
    expect(serialized).not.toContain('18.5');
    expect(publicProfile.verified).toBe(true);
    expect(publicProfile.companyName).toBe('Acme GmbH');
  });

  it('validates public account request submission and normalizes country code', () => {
    const parsed = submitAccountRequestSchema.parse({
      firstName: '  Layla ',
      lastName: ' Mansour ',
      email: 'layla@mansour-trading.jo',
      phone: '+962 79 0000000',
      company: 'Mansour Trading LLC',
      country: 'jo',
      locale: 'ar',
    });

    expect(parsed.firstName).toBe('Layla');
    expect(parsed.lastName).toBe('Mansour');
    expect(parsed.country).toBe('JO');
    expect(parsed.locale).toBe('ar');
  });

  it('validates buyer RFQ order submission payload', () => {
    const parsed = submitBuyerOrderSchema.parse({
      items: [
        {
          sku: 'HP-AX100',
          quantity: 10,
          options: [{ name: 'Port Size', value: 'SAE-16' }],
        },
      ],
      notes: 'Deliver to Hamburg port warehouse.',
      locale: 'en',
    });

    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.sku).toBe('HP-AX100');
    expect(parsed.items[0]?.quantity).toBe(10);
  });

  it('validates server-side pagination & filter query schemas', () => {
    const buyersQuery = listBuyersQuerySchema.parse({
      status: 'active',
      search: 'Acme',
      limit: '50',
      offset: '100',
    });
    expect(buyersQuery).toEqual({
      status: 'active',
      search: 'Acme',
      limit: 50,
      offset: 100,
    });

    const requestsQuery = listAccountRequestsQuerySchema.parse({
      status: 'pending',
      limit: '25',
    });
    expect(requestsQuery).toEqual({
      status: 'pending',
      limit: 25,
      offset: 0,
    });

    const buyerOrdersQuery = listBuyerOrdersQuerySchema.parse({
      page: '2',
      pageSize: '20',
      status: 'confirmed',
    });
    expect(buyerOrdersQuery).toEqual({
      page: 2,
      pageSize: 20,
      status: 'confirmed',
    });
  });

  it('validates buyer profile edit request submission and admin query schemas', () => {
    const req = submitProfileEditRequestSchema.parse({
      firstName: '  Hans ',
      lastName: ' Gruber ',
      company: 'Acme Global GmbH',
      jobTitle: 'VP Supply Chain',
      phone: '+49 170 9999999',
      country: 'de',
      city: 'Munich',
      address: 'Maximilianstr. 1',
    });
    expect(req.firstName).toBe('Hans');
    expect(req.country).toBe('DE');
    expect(req.city).toBe('Munich');

    const adminQuery = listProfileEditRequestsQuerySchema.parse({});
    expect(adminQuery.status).toBe('pending');
  });
});
