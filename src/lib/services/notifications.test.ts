import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  notifyAccountApproved,
  notifyOrderConfirmed,
  notifyOrderSubmitted,
  sendTransactionalEmail,
} from '@/lib/services/notifications';

describe('notifications service', () => {
  const originalApiKey = process.env.RESEND_API_KEY;

  afterEach(() => {
    process.env.RESEND_API_KEY = originalApiKey;
    vi.restoreAllMocks();
  });

  it('returns sent=false without throwing when RESEND_API_KEY is unset', async () => {
    delete process.env.RESEND_API_KEY;
    const res = await sendTransactionalEmail({
      to: 'buyer@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
    expect(res).toEqual({ sent: false });
  });

  it('dispatches Resend HTTP request when RESEND_API_KEY is configured', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }));

    await notifyAccountApproved({
      to: 'buyer@example.com',
      contactName: 'Alice <Buyer>',
      companyName: 'Acme & Co',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body)) as {
      to: string[];
      subject: string;
      html: string;
    };
    expect(body.to).toEqual(['buyer@example.com']);
    expect(body.subject).toContain('approved');
    expect(body.html).toContain('Alice &lt;Buyer&gt;');
    expect(body.html).toContain('Acme &amp; Co');
  });

  it('formats order confirmation and submission emails with order link', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }));

    await notifyOrderSubmitted({
      to: 'buyer@example.com',
      contactName: 'Alice',
      orderNumber: 'O-2026-0042',
      submittedSubtotalAmount: 1450.5,
      currency: 'USD',
    });

    await notifyOrderConfirmed({
      to: 'buyer@example.com',
      contactName: 'Alice',
      orderNumber: 'O-2026-0042',
      confirmedTotalAmount: 1400,
      currency: 'USD',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const confirmedBody = JSON.parse(String(fetchMock.mock.calls[1]![1]?.body)) as {
      subject: string;
      html: string;
    };
    expect(confirmedBody.subject).toContain('O-2026-0042');
    expect(confirmedBody.html).toContain('1400.00 USD');
    expect(confirmedBody.html).toContain('/en/orders/O-2026-0042');
  });
});
