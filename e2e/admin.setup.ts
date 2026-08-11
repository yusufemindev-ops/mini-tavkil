import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { test as setup, expect } from '@playwright/test';

/**
 * Saves an admin session once so the admin specs can reuse it.
 *
 * Sign-in is Google OAuth, which cannot be automated safely or reliably — it is a
 * third party's login page with its own bot defences, and scripting it would mean
 * putting real credentials in the repo. So this is a **one-time manual step**:
 *
 *   1. `pnpm exec playwright open --save-storage=e2e/.auth/admin.json <site>/sign-in`
 *   2. sign in with an allowlisted Google account
 *   3. close the browser — the session is written to e2e/.auth/admin.json
 *
 * That file is gitignored. It expires with the session (7 days), so repeat when
 * the admin specs start failing with a redirect to /sign-in.
 */
const STORAGE = 'e2e/.auth/admin.json';

setup('an admin session exists', async () => {
  if (!existsSync(dirname(STORAGE))) mkdirSync(dirname(STORAGE), { recursive: true });

  if (!existsSync(STORAGE)) {
    setup.skip(
      true,
      `No saved admin session at ${STORAGE}. Create one with:\n` +
        `  pnpm exec playwright open --save-storage=${STORAGE} $E2E_BASE_URL/sign-in\n` +
        `then sign in with an allowlisted Google account and close the browser.`,
    );
  }

  /**
   * The session cookie is scoped to the host it was captured on, and the config
   * quietly defaults to localhost when `E2E_BASE_URL` is unset. Run the admin
   * specs without it and the browser simply never sends the cookie — every
   * request comes back 401 and eleven specs fail as if the session had expired.
   *
   * It had not. That mismatch cost a wrong diagnosis and a claim that the suite
   * was broken when it passed 61/61 against the right host. Comparing the two
   * hosts up front turns a wall of misleading 401s into one sentence naming the
   * actual problem.
   */
  const baseURL = setup.info().project.use.baseURL;
  if (!baseURL) return;

  const cookies = (
    JSON.parse(readFileSync(STORAGE, 'utf8')) as { cookies?: { domain: string; name: string }[] }
  ).cookies;
  const session = cookies?.find((cookie) => cookie.name.includes('session_token'));
  if (!session) return;

  // A cookie on `.example.com` is valid for `admin.example.com`, so compare by
  // suffix rather than equality.
  const target = new URL(baseURL).hostname;
  const cookieHost = session.domain.replace(/^\./, '');
  const matches = target === cookieHost || target.endsWith(`.${cookieHost}`);

  expect(
    matches,
    `The saved admin session belongs to "${cookieHost}", but these tests are pointed at ` +
      `"${target}", so the session cookie will not be sent and every admin request will 401.\n` +
      `Either run against the host the session was captured on:\n` +
      `  E2E_BASE_URL=https://${cookieHost} pnpm e2e\n` +
      `or capture a new session for "${target}".`,
  ).toBe(true);
});
