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
 * possible:
 *
 *   1. rate limit   — at the edge, before any CPU is spent
 *   2. Turnstile    — before parsing, before touching the database
 *   3. validation   — bounded fields, server-side
 *   4. settings     — one database read
 *   5. send         — the expensive bit
 *
 * Verifying the captcha *after* reading settings would mean a bot still costs us
 * a Neon query on every attempt.
 */
export const dynamic = 'force-dynamic';

interface RateLimiter {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
}

interface EmailBinding {
  send: (message: unknown) => Promise<void>;
}

function clientIp(request: Request): string | null {
  return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for');
}

export async function POST(request: Request) {
  try {
    const env = getCloudflareContext().env as unknown as {
      CONTACT_RATE_LIMIT?: RateLimiter;
      CONTACT_EMAIL?: EmailBinding;
    };

    const ip = clientIp(request);

    // 1. Rate limit first — nothing below this line runs for a flood.
    //
    // Deliberately not `if (limiter && ip)`. A security control that silently
    // does nothing when a binding or header is missing is worse than none, since
    // it looks present in code review; if the IP is unknown every such request
    // shares one bucket, which is the conservative reading.
    if (env.CONTACT_RATE_LIMIT) {
      const { success } = await env.CONTACT_RATE_LIMIT.limit({ key: ip ?? 'unknown-ip' });
      if (!success) {
        throw new AppError('rate_limited', 'Too many messages. Please try again in a minute.');
      }
    } else {
      console.error('CONTACT_RATE_LIMIT binding is missing — the contact form is unthrottled.');
    }

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
