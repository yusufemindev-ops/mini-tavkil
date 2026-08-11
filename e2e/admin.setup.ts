import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { test as setup } from '@playwright/test';

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
});
