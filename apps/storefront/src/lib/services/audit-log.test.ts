import { describe, expect, it } from 'vitest';
import { listAuditLogsSchema } from './audit-log-schema';
import { extractAuditDetails, sanitizeIp } from './audit-log';

describe('sanitizeIp', () => {
  it('accepts valid IPv4 and first X-Forwarded-For hop', () => {
    expect(sanitizeIp('203.0.113.42')).toBe('203.0.113.42');
    expect(sanitizeIp('203.0.113.42, 10.0.0.1')).toBe('203.0.113.42');
  });

  it('accepts valid IPv6 addresses', () => {
    expect(sanitizeIp('2001:db8::1')).toBe('2001:db8::1');
  });

  it('returns null for malformed or empty values', () => {
    expect(sanitizeIp(null)).toBeNull();
    expect(sanitizeIp('')).toBeNull();
    expect(sanitizeIp('999.999.999.999')).toBeNull();
    expect(sanitizeIp('not-an-ip')).toBeNull();
  });
});

describe('extractAuditDetails', () => {
  it('reads target and summary from afterState', () => {
    expect(
      extractAuditDetails('product.published', 'product', 'p-1', {
        target: 'HP-AX100',
        summary: 'Published product HP-AX100',
      }),
    ).toEqual({
      target: 'HP-AX100',
      summary: 'Published product HP-AX100',
    });
  });

  it('falls back cleanly when afterState is null', () => {
    expect(extractAuditDetails('settings.updated', 'settings', null, null)).toEqual({
      target: '—',
      summary: 'settings updated (settings)',
    });
  });

  it('shortens raw UUIDs in target and summary to 8-character #id prefixes', () => {
    expect(
      extractAuditDetails('supplier.deleted', 'supplier', '7db09f20-169f-4b91-99f1-82f54d729f14', {
        target: '7db09f20-169f-4b91-99f1-82f54d729f14',
        summary: 'Deleted supplier 7db09f20-169f-4b91-99f1-82f54d729f14',
      }),
    ).toEqual({
      target: '#7db09f20',
      summary: 'Deleted supplier #7db09f20',
    });
  });
});

describe('listAuditLogsSchema', () => {
  it('applies defaults and bounds pageSize to 100', () => {
    expect(listAuditLogsSchema.parse({})).toEqual({ page: 1, pageSize: 25 });
    expect(() => listAuditLogsSchema.parse({ pageSize: 500 })).toThrow();
  });
});
