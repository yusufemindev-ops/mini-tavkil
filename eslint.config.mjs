import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build output: OpenNext bundles the whole Worker here, and linting a
    // generated 30k-line bundle produces hundreds of meaningless errors.
    ".open-next/**",
    ".wrangler/**",
    // drizzle-kit generates these — never hand-edited, so never linted.
    "drizzle/**",
  ]),
]);

export default eslintConfig;
