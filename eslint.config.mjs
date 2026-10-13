import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Global Ignores
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '.open-next/**',
    'admin/**',
    'public/admin/**',
    '.wrangler/**',
    'drizzle/**',
    'node_modules/**',
    'cloudflare-env.d.ts',
  ]),

  // Senior Engineering Rules: Type-safety, Consistency & Style
  {
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
    },
  },

  // PRICING-VISIBILITY GUARD (Tavkil Hard Rule #1)
  // Internal pricing fields must NEVER appear in public-facing code
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/app/api/admin/**',
      'src/lib/services/**',
      'src/lib/db/**',
      'src/lib/auth.ts',
      'src/**/__tests__/**',
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
