import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import sonarjs from 'eslint-plugin-sonarjs';
import security from 'eslint-plugin-security';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  sonarjs.configs.recommended,
  security.configs.recommended,

  // Global Ignores
  globalIgnores([
    '.next/**',
    'apps/storefront/.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'apps/storefront/next-env.d.ts',
    '.open-next/**',
    'apps/storefront/.open-next/**',
    'apps/admin/**',
    'apps/api/dist/**',
    '.wrangler/**',
    'apps/**/.wrangler/**',
    'drizzle/**',
    'node_modules/**',
    'apps/**/node_modules/**',
    'packages/**/node_modules/**',
    'cloudflare-env.d.ts',
    'apps/storefront/cloudflare-env.d.ts',
    'playwright-report/**',
    'test-results/**',
  ]),

  // Senior Engineering, SonarJS & Security Rules
  {
    settings: {
      next: {
        rootDir: 'apps/storefront',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_|^table$', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'smart'],
      // TypeScript already enforces property types; generic bracket access is not a prototype-pollution sink.
      'security/detect-object-injection': 'off',
      // Delegated to @typescript-eslint/no-unused-vars (which honors _-prefixed unused vars).
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/no-nested-template-literals': 'off',
      'sonarjs/void-use': 'off',
      'sonarjs/super-linear-regex': 'warn',
      'sonarjs/cognitive-complexity': ['warn', 20],
    },
  },

  // CLI scripts & test files legitimately spawn binaries, read paths, and use complex test regexes
  {
    files: ['scripts/**', 'e2e/**', '**/*.test.ts', '**/*.test.tsx', '**/next.config.ts'],
    rules: {
      'sonarjs/no-os-command-from-path': 'off',
      'sonarjs/no-fixed-wait-in-tests': 'off',
      'sonarjs/prefer-specific-assertions': 'off',
      'sonarjs/regex-complexity': 'off',
      'sonarjs/super-linear-regex': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
    },
  },

  // PRICING-VISIBILITY GUARD (Tavkil Hard Rule #1)
  // Internal pricing fields must NEVER appear in public-facing code
  {
    files: ['apps/storefront/src/**/*.{ts,tsx}', 'apps/api/src/**/*.{ts,tsx}'],
    ignores: [
      'apps/storefront/src/app/api/admin/**',
      'apps/api/src/routes/admin/**',
      'apps/storefront/src/lib/services/**',
      'apps/storefront/src/lib/db/**',
      'apps/storefront/src/lib/auth.ts',
      'apps/**/__tests__/**',
      '**/*.test.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Identifier[name=/basePriceAmount|basePriceCurrency|tierMarkupPercent|baseTotalAmount/]',
          message:
            'Internal pricing fields are forbidden in public-facing code. Use computed price or public product shape. See CLAUDE.md §1.',
        },
      ],
    },
  },

  // Prettier must be last to turn off conflicting ESLint formatting rules
  prettier,
]);

export default eslintConfig;
