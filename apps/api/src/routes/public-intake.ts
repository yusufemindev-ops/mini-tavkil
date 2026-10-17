import { Hono } from 'hono';
import { invalid } from '@/lib/api/errors';
import { submitPublicAccountRequest } from '@/lib/services/account-requests';
import { submitAccountRequestSchema } from '@/lib/services/account-requests-schema';
import { publicContactSchema } from '@/lib/services/buyer-portal';
import { notifyContactSubmission } from '@/lib/services/notifications';
import { parseJson, type AppEnv } from '@/server/factory';

const CF_DUMMY_PASS_SECRET = '1x0000000000000000000000000000000AA';

async function verifyTurnstileToken(token?: string, remoteIp?: string | null): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return;
  const effectiveToken =
    token?.trim() || (secret === CF_DUMMY_PASS_SECRET ? 'XXXX.DUMMY.TOKEN.XXXX' : '');
  if (!effectiveToken) {
    throw invalid('Security verification is required.');
  }

  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', effectiveToken);
  if (remoteIp) form.set('remoteip', remoteIp);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!res || !res.ok) {
    throw invalid('Security verification failed. Please try again.');
  }
  const payload = (await res.json()) as { success?: boolean };
  if (!payload.success) {
    throw invalid('Security verification failed. Please try again.');
  }
}

export const publicAccountRequestsRoutes = new Hono<AppEnv>().post('/', async (c) => {
  const body = await parseJson(c, submitAccountRequestSchema);
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? null;
  await verifyTurnstileToken(body.turnstileToken, ip);
  const created = await submitPublicAccountRequest(body, {
    ipAddress: ip,
    userAgent: c.req.header('user-agent') ?? null,
  });
  return c.json({ data: created }, 201, { 'Cache-Control': 'private, no-store' });
});

export const publicContactRoutes = new Hono<AppEnv>().post('/', async (c) => {
  const body = await parseJson(c, publicContactSchema);
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? null;
  await verifyTurnstileToken(body.turnstileToken, ip);
  await notifyContactSubmission({
    name: body.name,
    email: body.email,
    company: body.company,
    message: `[${body.subject}] ${body.message}${body.phone ? `\nPhone: ${body.phone}` : ''}`,
  });
  return c.json({ data: { ok: true } }, 200, { 'Cache-Control': 'private, no-store' });
});
