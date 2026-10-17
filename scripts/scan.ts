import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

interface Finding {
  severity: 'ERROR' | 'WARN';
  rule: string;
  file: string;
  line: number;
  message: string;
}

const ROOT = process.cwd();
const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  '.open-next',
  '.wrangler',
  'dist',
  'build',
  'out',
  '.git',
  'drizzle',
  'generated',
]);

function walkFiles(dir: string, exts = new Set(['.ts', '.tsx'])): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkFiles(full, exts));
    } else if ([...exts].some((ext) => entry.endsWith(ext)) && !entry.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

function lineAtOffset(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

function isTestFile(relPath: string): boolean {
  return (
    relPath.endsWith('.test.ts') ||
    relPath.endsWith('.test.tsx') ||
    relPath.endsWith('.spec.ts') ||
    relPath.includes('__tests__/') ||
    relPath.startsWith('e2e/')
  );
}

function checkWorkerRules(relPath: string, content: string, findings: Finding[]) {
  if (
    !relPath.startsWith('apps/storefront/src/') &&
    !relPath.startsWith('apps/api/src/') &&
    !relPath.startsWith('packages/shared/src/')
  ) {
    return;
  }

  const txMatch = /\b(?:db|tx)\.transaction\s*\(/.exec(content);
  if (txMatch) {
    findings.push({
      severity: 'ERROR',
      rule: 'workers/no-interactive-transaction',
      file: relPath,
      line: lineAtOffset(content, txMatch.index),
      message: 'Interactive db.transaction() is unsupported on neon-http. Use db.batch([...]).',
    });
  }

  const bannedPkg = /from\s+['"](sharp|@prisma\/client|prisma)['"]/.exec(content);
  if (bannedPkg) {
    findings.push({
      severity: 'ERROR',
      rule: 'workers/no-banned-runtime-import',
      file: relPath,
      line: lineAtOffset(content, bannedPkg.index),
      message: `Forbidden Cloudflare Workers runtime import '${bannedPkg[1]}'.`,
    });
  }
}

const SECRET_FIELD_NAMES = new Set([
  'secret',
  'token',
  'password',
  'passwd',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
  'clientsecret',
  'webhooksecret',
]);

function checkSecretRules(relPath: string, content: string, findings: Finding[]) {
  const propRe = /\b(?:private|protected)\s+(?:readonly\s+)?(\w+)\s*[:=]/g;
  for (const match of content.matchAll(propRe)) {
    const fieldName = match[1] ?? '';
    const lower = fieldName.toLowerCase();
    if ([...SECRET_FIELD_NAMES].some((s) => lower.includes(s))) {
      findings.push({
        severity: 'ERROR',
        rule: 'security/secret-serialization-holder',
        file: relPath,
        line: lineAtOffset(content, match.index),
        message: `TypeScript private/protected field '${fieldName}' is enumerable at runtime and leaks via JSON.stringify/logs. Use ES #private field or closure.`,
      });
    }
  }

  const envDumpSink =
    /console\.(?:log|info|warn|error|debug)\s*\([^)]*\b(?:process\.env|c\.env)\b(?!\.)/.exec(
      content,
    );
  if (envDumpSink) {
    findings.push({
      severity: 'ERROR',
      rule: 'security/secret-serialization-sink',
      file: relPath,
      line: lineAtOffset(content, envDumpSink.index),
      message: 'Never log whole process.env or c.env object (wholesale secret sink).',
    });
  }
}

function isProtectedAdminRoute(relPath: string): boolean {
  if (relPath.startsWith('apps/storefront/src/app/api/admin/') && relPath.endsWith('/route.ts')) {
    return true;
  }
  return (
    relPath.startsWith('apps/api/src/routes/admin/') &&
    !relPath.endsWith('/index.ts') &&
    !relPath.endsWith('/me.ts')
  );
}

function checkAdminRouteRules(relPath: string, content: string, findings: Finding[]) {
  if (!isProtectedAdminRoute(relPath)) return;

  const hasGuard =
    content.includes('adminRoute(') ||
    content.includes('requireAdminPerm(') ||
    content.includes('requireAdminPermission(');
  if (!hasGuard) {
    findings.push({
      severity: 'ERROR',
      rule: 'security/admin-route-permission',
      file: relPath,
      line: 1,
      message:
        'Admin route handler must enforce permissions via adminRoute() or requireAdminPerm().',
    });
  }

  const dotPerm =
    /(?:adminRoute|requireAdminPerm|requireAdminPermission)\s*\(\s*['"]([a-z_]+\.[a-z_]+)['"]/.exec(
      content,
    );
  if (dotPerm) {
    findings.push({
      severity: 'ERROR',
      rule: 'security/permission-colon-notation',
      file: relPath,
      line: lineAtOffset(content, dotPerm.index),
      message: `Invalid dot permission '${dotPerm[1]}'. Always use colon notation (domain:action).`,
    });
  }
}

function isPublicStorefrontRoute(relPath: string): boolean {
  return (
    relPath.startsWith('apps/storefront/src/app/[locale]/') &&
    !relPath.includes('/account') &&
    !relPath.includes('/cart') &&
    !relPath.includes('/orders') &&
    !relPath.includes('/(buyer)/')
  );
}

function checkSeoRules(relPath: string, content: string, findings: Finding[]) {
  if (relPath === 'apps/storefront/src/app/sitemap.ts') {
    const nowDate = /lastModified\s*:\s*new\s+Date\s*\(\s*\)/.exec(content);
    if (nowDate) {
      findings.push({
        severity: 'ERROR',
        rule: 'seo/sitemap-real-updated-at',
        file: relPath,
        line: lineAtOffset(content, nowDate.index),
        message: 'Sitemap lastModified must come from row updated_at, never new Date().',
      });
    }
  }

  if (isPublicStorefrontRoute(relPath)) {
    const rqImport = /from\s+['"]@tanstack\/react-query['"]/.exec(content);
    if (rqImport) {
      findings.push({
        severity: 'ERROR',
        rule: 'seo/no-react-query-on-public-page',
        file: relPath,
        line: lineAtOffset(content, rqImport.index),
        message: 'Public indexable pages must use Server Components, never TanStack Query.',
      });
    }
  }
}

function checkFileSizeHealth(relPath: string, content: string, findings: Finding[]) {
  if (
    relPath.includes('/vendor/') ||
    relPath.endsWith('docs.ts') ||
    relPath.endsWith('db/schema.ts')
  ) {
    return;
  }
  const lineCount = content.split('\n').length;
  if (lineCount > 1000) {
    findings.push({
      severity: 'WARN',
      rule: 'quality/file-size-health',
      file: relPath,
      line: 1,
      message: `File has ${lineCount} lines (> 1000 threshold). Consider decomposing helpers or subcomponents.`,
    });
  }
}

function scanCustomRules(files: string[]): Finding[] {
  const findings: Finding[] = [];

  for (const absPath of files) {
    const relPath = relative(ROOT, absPath).replace(/\\/g, '/');
    if (isTestFile(relPath)) continue;
    const content = readFileSync(absPath, 'utf8');

    checkWorkerRules(relPath, content, findings);
    checkSecretRules(relPath, content, findings);
    checkAdminRouteRules(relPath, content, findings);
    checkSeoRules(relPath, content, findings);
    checkFileSizeHealth(relPath, content, findings);
  }

  return findings;
}

function runStep(
  label: string,
  cmd: string,
): { name: string; ok: boolean; durationMs: number; output: string } {
  const start = Date.now();
  try {
    const output = execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
    return { name: label, ok: true, durationMs: Date.now() - start, output };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string };
    return {
      name: label,
      ok: false,
      durationMs: Date.now() - start,
      output: `${e.stdout ?? ''}\n${e.stderr ?? ''}`.trim(),
    };
  }
}

function main() {
  const args = new Set(process.argv.slice(2));
  const quick = args.has('--quick');

  console.log(
    `\n🔍 mini-tavkil Quality & Security Gate (${quick ? 'Quick Mode' : 'Full SonarJS + SAST Mode'})\n`,
  );

  const files = [
    ...walkFiles(join(ROOT, 'apps/storefront/src')),
    ...walkFiles(join(ROOT, 'apps/api/src')),
    ...walkFiles(join(ROOT, 'apps/admin/src')),
    ...walkFiles(join(ROOT, 'packages/shared/src')),
  ];

  const customStart = Date.now();
  const findings = scanCustomRules(files);
  const customMs = Date.now() - customStart;

  const errors = findings.filter((f) => f.severity === 'ERROR');
  const warnings = findings.filter((f) => f.severity === 'WARN');

  for (const f of findings) {
    const icon = f.severity === 'ERROR' ? '❌' : '⚠️ ';
    console.log(`${icon} [${f.rule}] ${f.file}:${f.line} — ${f.message}`);
  }

  const steps: { name: string; ok: boolean; durationMs: number; output?: string }[] = [
    {
      name: `SAST & Architecture Guards (${files.length} files)`,
      ok: errors.length === 0,
      durationMs: customMs,
    },
    runStep('i18n Locale Parity (en/tr/ar)', 'bash scripts/check-locale-parity.sh'),
  ];

  if (!quick) {
    steps.push(runStep('SonarJS & Security Lint (Storefront + API)', 'pnpm lint'));
    steps.push(runStep('SonarJS & Security Lint (Admin SPA)', 'pnpm admin:lint'));
    steps.push(runStep('TypeScript Strict Check (Storefront + API)', 'pnpm typecheck'));
    steps.push(runStep('TypeScript Strict Check (Admin SPA)', 'pnpm admin:typecheck'));
    steps.push(
      runStep('Dependency Vulnerability Audit (Prod CVEs)', 'pnpm audit --prod --audit-level=high'),
    );
  }

  console.log('\n─────────────────────────────────────────────────────────────');
  for (const s of steps) {
    const status = s.ok ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}  ${s.name.padEnd(44)} (${(s.durationMs / 1000).toFixed(2)}s)`);
    if (!s.ok && s.output) {
      console.log(`\n${s.output}\n`);
    }
  }
  console.log('─────────────────────────────────────────────────────────────');

  const failed = steps.some((s) => !s.ok);
  if (failed) {
    console.error(
      `\n❌ Quality Gate FAILED (${errors.length} guard errors, ${warnings.length} warnings).\n`,
    );
    process.exit(1);
  }

  console.log(
    `\n✅ Quality Gate PASSED (${files.length} files scanned, ${warnings.length} warnings).\n`,
  );
}

main();
