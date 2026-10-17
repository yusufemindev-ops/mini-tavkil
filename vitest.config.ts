import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'apps/storefront/src/**/*.test.ts',
            'apps/api/src/**/*.test.ts',
            'packages/shared/src/**/*.test.ts',
            'scripts/**/*.test.ts',
          ],
          exclude: ['apps/storefront/src/**/*.integration.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          include: ['apps/storefront/src/**/*.test.tsx'],
        },
      },
      {
        // Hits a real Neon branch — see TESTING.md §1. Uses DIRECT_URL, so
        // interactive transactions are allowed here (unlike request paths).
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['apps/storefront/src/**/*.integration.test.ts'],
          testTimeout: 30_000,
        },
      },
    ],
  },
});
