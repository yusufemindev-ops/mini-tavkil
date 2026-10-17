import { invalid } from '@/lib/api/errors';

/**
 * Cloudflare Turnstile server-side verification.
 *
 * Two rules make this worth anything, and both are easy to get wrong:
 *
 * 1. **It runs before anything else.** Verifying after parsing, after a database
 *    read, or after composing an email means a bot has already spent our budget
 *    even when it is rejected.
 * 2. **A missing secret means refuse, not allow.** Treating "not configured" as
 *    "skip the check" turns one unset variable into an open relay into someone's
 *    inbox — the exact failure mode this is here to prevent.
 */
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const CF_DUMMY_PASS_SECRET = '1x0000000000000000000000000000000AA';

export type TurnstileResult =
  | { ok: true }
  | { ok: false; reason: 'not-configured' | 'missing-token' | 'failed' | 'unreachable' };

export async function verifyTurnstile(
  token: string | undefined,
  ip: string | null,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return { ok: false, reason: 'not-configured' };

  const effectiveToken =
    token?.trim() || (secret === CF_DUMMY_PASS_SECRET ? 'XXXX.DUMMY.TOKEN.XXXX' : '');
  if (!effectiveToken) return { ok: false, reason: 'missing-token' };

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', effectiveToken);
  if (ip) body.set('remoteip', ip);

  try {
    const response = await fetch(SITEVERIFY, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { ok: false, reason: 'unreachable' };

    const data = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (data.success !== true) {
      console.warn(
        'Turnstile rejected a submission:',
        data['error-codes']?.join(', ') ?? 'unknown',
      );
      return { ok: false, reason: 'failed' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

/** Enforces Turnstile verification on public intake endpoints (fails closed with 422). */
export async function assertTurnstile(token?: string, ip?: string | null): Promise<void> {
  const result = await verifyTurnstile(token, ip ?? null);
  if (result.ok) return;
  if (result.reason === 'not-configured') {
    throw invalid('Security verification is unavailable.');
  }
  if (result.reason === 'missing-token') {
    throw invalid('Security verification is required.');
  }
  throw invalid('Security verification failed. Please try again.');
}
