import { Hono } from 'hono';
import { assertTurnstile } from '@/lib/contact/turnstile';
import { submitPublicAccountRequest } from '@/lib/services/account-requests';
import { submitAccountRequestSchema } from '@/lib/services/account-requests-schema';
import { publicContactSchema } from '@/lib/services/buyer-portal';
import { notifyContactSubmission } from '@/lib/services/notifications';
import { clientIp, parseJson, rateLimit, type AppEnv } from '@/server/factory';

const INTAKE_RATE_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 };

export const publicAccountRequestsRoutes = new Hono<AppEnv>().post(
  '/',
  rateLimit({ ...INTAKE_RATE_LIMIT, keyPrefix: 'account-requests' }),
  async (c) => {
    const body = await parseJson(c, submitAccountRequestSchema);
    const ip = clientIp(c);
    await assertTurnstile(body.turnstileToken, ip);
    const created = await submitPublicAccountRequest(body, {
      ipAddress: ip,
      userAgent: c.req.header('user-agent') ?? null,
    });
    return c.json({ data: created }, 201, { 'Cache-Control': 'private, no-store' });
  },
);

export const publicContactRoutes = new Hono<AppEnv>().post(
  '/',
  rateLimit({ ...INTAKE_RATE_LIMIT, keyPrefix: 'contact' }),
  async (c) => {
    const body = await parseJson(c, publicContactSchema);
    const ip = clientIp(c);
    await assertTurnstile(body.turnstileToken, ip);
    await notifyContactSubmission({
      name: body.name,
      email: body.email,
      company: body.company,
      message: `[${body.subject}] ${body.message}${body.phone ? `\nPhone: ${body.phone}` : ''}`,
    });
    return c.json({ data: { ok: true } }, 200, { 'Cache-Control': 'private, no-store' });
  },
);
