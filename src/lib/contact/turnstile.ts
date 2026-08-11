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

export type TurnstileResult =
  { ok: true } | { ok: false; reason: 'not-configured' | 'failed' | 'unreachable' };

export async function verifyTurnstile(token: string, ip: string | null): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, reason: 'not-configured' };

  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);

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
    // Turnstile unreachable → refuse. Failing open here would mean a bot could
    // get through simply by making the verification endpoint time out.
    return { ok: false, reason: 'unreachable' };
  }
}
