import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

// Critical flows are listed in TESTING.md §2. Flow 2 — no price or supplier text
// on any public page — is the one that must never be skipped or muted.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  /**
   * Retry once against a deployed URL, locally too.
   *
   * Neon's free tier autosuspends its compute and rate-limits bursts, and this
   * suite renders dozens of uncached, database-backed pages at once. A handful
   * time out or 5xx on any given run — a different handful each time — while
   * every one of them passes in isolation. Real traffic does not behave this way:
   * public pages are ISR-cached, so a visitor hits the cache, not the database.
   *
   * One retry, not more, and `trace: 'on-first-retry'` keeps the evidence: a test
   * that fails twice is a real failure and still reports as one.
   */
  retries: process.env.E2E_BASE_URL || process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html'], ['github']] : [['html']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'public',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /public\/.*\.spec\.ts/,
    },
    {
      // Signs in once and saves the session; admin specs reuse it.
      name: 'admin-setup',
      testMatch: /admin\.setup\.ts/,
    },
    {
      name: 'admin',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
      testMatch: /admin\/.*\.spec\.ts/,
      dependencies: ['admin-setup'],
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
