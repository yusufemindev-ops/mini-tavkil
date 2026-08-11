import { getCloudflareContext } from '@opennextjs/cloudflare';
import { AppError, toErrorResponse } from '@/lib/api/errors';
import { contactSchema } from '@/lib/contact/schema';
import { verifyTurnstile } from '@/lib/contact/turnstile';
import { getGeneralSettings } from '@/lib/services/settings';

/**
 * The contact form — the only public write on this site, and its only conversion
 * path.
 *
 * The order of the checks below is the design, not an accident. Each step is
 * cheaper than the one after it, so an abusive request is dropped as early as
 * possible: Turnstile before parsing and before touching the database, then
 * validation, then one settings read, then the send. Verifying the captcha
 * *after* reading settings would mean a bot still costs a Neon query per attempt.
 *
 * **Rate limiting is a WAF rule, not code here.** An in-Worker limiter using
 * Cloudflare's ratelimit binding was tried and removed: it never returned a 429
 * across repeated bursts and produced no diagnostic, so it was a control that
 * looked present in review while doing nothing — worse than none at all. The
 * limit belongs at the edge anyway, where a flood never reaches this handler.
 * See GO-LIVE.md.
 */
export const dynamic = 'force-dynamic';

interface EmailBinding {
  send: (message: unknown) => Promise<void>;
}

function clientIp(request: Request): string | null {
  return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for');
}

export async function POST(request: Request) {
  try {
    const env = getCloudflareContext().env as unknown as { CONTACT_EMAIL?: EmailBinding };

    const ip = clientIp(request);

    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== 'object') {
      throw new AppError('validation.failed', 'Request body must be valid JSON.');
    }

    // 2. Turnstile, before validation and before any database access. A missing
    //    secret refuses the submission rather than skipping the check.
    const token = String((raw as { turnstileToken?: unknown }).turnstileToken ?? '');
    const verification = await verifyTurnstile(token, ip);
    if (!verification.ok) {
      if (verification.reason === 'not-configured') {
        throw new AppError(
          'internal.error',
          'The contact form is not configured yet. Please email us directly.',
        );
      }
      throw new AppError('validation.failed', 'Verification failed. Please try again.', {
        turnstileToken: ['Could not verify that you are human.'],
      });
    }

    // 3. Validation. `parse` throws ZodError → 422 with per-field messages, which
    //    is what lets the form show errors inline without losing what was typed.
    const input = contactSchema.parse(raw);

    // 4. Where it goes. Admin-only setting — never rendered publicly.
    const settings = await getGeneralSettings();
    const destination = settings.inquiryEmail || settings.contactEmail;
    if (!destination) {
      throw new AppError(
        'internal.error',
        'No inquiry address is configured. Please email us directly.',
      );
    }

    // 5. Send. The binding is added when the custom domain lands (PLAN.md §15) —
    //    until then this fails loudly rather than silently dropping an enquiry.
    if (!env.CONTACT_EMAIL) {
      console.error('Contact submission received but CONTACT_EMAIL binding is absent:', {
        to: destination,
        from: input.email,
      });
      throw new AppError(
        'internal.error',
        'We could not send your message right now. Please email us directly.',
      );
    }

    await env.CONTACT_EMAIL.send(buildMessage(input, destination));

    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return toErrorResponse(error);
  }
}

function buildMessage(input: ReturnType<typeof contactSchema.parse>, to: string) {
  const lines = [
    `From: ${input.name} <${input.email}>`,
    input.company ? `Company: ${input.company}` : null,
    `Locale: ${input.locale}`,
    input.productName ? `Product: ${input.productName} (${input.productSlug})` : null,
    '',
    input.message,
  ].filter((line) => line !== null);

  return {
    to,
    // The envelope sender must be our own domain — sending as the visitor's
    // address would fail SPF/DMARC and land the whole thing in spam. Their
    // address goes in Reply-To, which is what a reply should actually use.
    from: `noreply@${to.split('@')[1] ?? 'tavkil.com'}`,
    replyTo: input.email,
    subject: input.productName
      ? `Quote request: ${input.productName}`
      : `Website enquiry from ${input.name}`,
    text: lines.join('\n'),
  };
}
