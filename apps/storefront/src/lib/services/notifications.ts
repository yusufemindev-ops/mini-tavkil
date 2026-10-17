import { scheduleBackground } from '@/lib/cache';
import { getSiteSettings } from '@/lib/settings';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Sends a transactional email via Resend HTTP API when `RESEND_API_KEY` is configured.
 * Never throws so notification failures cannot abort database mutations.
 */
export async function sendTransactionalEmail(msg: EmailMessage): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.NOTIFICATION_FROM_EMAIL?.trim() || 'Tavkil Wholesale <noreply@tavkil.com>';

  if (!apiKey) {
    return { sent: false };
  }

  const task = (async () => {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [msg.to],
          subject: msg.subject,
          html: msg.html,
          ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(8000),
      });
      return { sent: res.ok };
    } catch {
      return { sent: false };
    }
  })();

  scheduleBackground(task);
  return task;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function notifyAccountApproved(params: {
  to: string;
  contactName: string;
  companyName: string;
}): Promise<void> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tavkil.com').replace(/\/$/, '');
  const loginUrl = `${baseUrl}/en/login`;
  await sendTransactionalEmail({
    to: params.to,
    subject: 'Your Tavkil wholesale buyer account is approved',
    html: `<p>Hello ${escapeHtml(params.contactName || params.companyName)},</p>
<p>Your wholesale buyer account for <strong>${escapeHtml(params.companyName)}</strong> has been approved and verified.</p>
<p>You can now sign in with Google to view personalized wholesale pricing and submit order requests:</p>
<p><a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p>
<p>— Tavkil Trade Desk</p>`,
  });
}

export async function notifyOrderConfirmed(params: {
  to: string;
  contactName: string;
  orderNumber: string;
  confirmedTotalAmount: number;
  currency: string;
}): Promise<void> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tavkil.com').replace(/\/$/, '');
  const orderUrl = `${baseUrl}/en/orders/${encodeURIComponent(params.orderNumber)}`;
  const totalFormatted = `${params.confirmedTotalAmount.toFixed(2)} ${params.currency}`;
  await sendTransactionalEmail({
    to: params.to,
    subject: `Order ${params.orderNumber} quote confirmed — Tavkil`,
    html: `<p>Hello ${escapeHtml(params.contactName || 'Buyer')},</p>
<p>Our trade desk has reviewed and confirmed pricing for your order request <strong>${escapeHtml(params.orderNumber)}</strong>.</p>
<p>Confirmed total: <strong>${escapeHtml(totalFormatted)}</strong></p>
<p>Review the line-item quote and accept or decline here: <a href="${escapeHtml(orderUrl)}">${escapeHtml(orderUrl)}</a></p>
<p>— Tavkil Trade Desk</p>`,
  });
}

export async function notifyOrderSubmitted(params: {
  to: string;
  contactName: string;
  orderNumber: string;
  submittedSubtotalAmount: number;
  currency: string;
}): Promise<void> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://tavkil.com').replace(/\/$/, '');
  const orderUrl = `${baseUrl}/en/orders/${encodeURIComponent(params.orderNumber)}`;
  const subtotalFormatted = `${params.submittedSubtotalAmount.toFixed(2)} ${params.currency}`;
  await sendTransactionalEmail({
    to: params.to,
    subject: `Order request ${params.orderNumber} received — Tavkil`,
    html: `<p>Hello ${escapeHtml(params.contactName || 'Buyer')},</p>
<p>We received your wholesale order request <strong>${escapeHtml(params.orderNumber)}</strong> (estimated subtotal: ${escapeHtml(subtotalFormatted)}).</p>
<p>Our team will verify factory availability and confirm your quote within 24 hours: <a href="${escapeHtml(orderUrl)}">${escapeHtml(orderUrl)}</a></p>
<p>— Tavkil Trade Desk</p>`,
  });
}

export async function notifyContactSubmission(params: {
  name: string;
  email: string;
  company?: string;
  message: string;
  productName?: string;
}): Promise<void> {
  const settings = await getSiteSettings().catch(() => ({ contactEmail: '' }));
  const target = settings.contactEmail || process.env.NOTIFICATION_TO_EMAIL || '';
  if (!target) return;

  await sendTransactionalEmail({
    to: target,
    replyTo: params.email,
    subject: `New wholesale enquiry from ${params.name}${params.company ? ` (${params.company})` : ''}`,
    html: `<p><strong>From:</strong> ${escapeHtml(params.name)} (${escapeHtml(params.email)})</p>
${params.company ? `<p><strong>Company:</strong> ${escapeHtml(params.company)}</p>` : ''}
${params.productName ? `<p><strong>Product:</strong> ${escapeHtml(params.productName)}</p>` : ''}
<p><strong>Message:</strong></p>
<p>${escapeHtml(params.message).replace(/\n/g, '<br/>')}</p>`,
  });
}
