import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const ADMIN_URL = process.env.E2E_ADMIN_URL ?? 'http://localhost:5173';

// Critical flows are listed in TESTING.md §2. Flow 2 — no price or supplier text
// on any public page — is the one that must never be skipped or muted.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
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
      use: { baseURL: ADMIN_URL },
      testMatch: /admin\.setup\.ts/,
    },
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: ADMIN_URL,
        storageState: 'e2e/.auth/admin.json',
      },
      testMatch: /admin\/.*\.spec\.ts/,
      dependencies: ['admin-setup'],
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: process.env.CI ? 'pnpm start' : 'pnpm dev:next',
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: process.env.CI
            ? 'pnpm --filter mini-tavkil-admin preview --port 5173 --strictPort'
            : 'pnpm dev:admin',
          url: ADMIN_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
