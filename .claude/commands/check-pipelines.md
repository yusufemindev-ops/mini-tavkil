# /check-pipelines [PR-number]

Fetch CI/CD pipeline results for a pull request, diagnose any failures, and fix them.

## Step 1: Discover PR

```bash
gh pr view --json number --jq '.number'
```

## Step 2: Watch or Inspect Checks

```bash
gh pr checks --watch
```

## Step 3: Diagnose & Fix Failures

For any failed check:

1. Inspect the failed run logs:
   ```bash
   gh run view <run_id> --log-failed
   ```
2. Reproduce and verify locally:
   - `pnpm lint && pnpm admin:lint`
   - `pnpm format:check`
   - `pnpm typecheck && pnpm admin:typecheck`
   - `pnpm check:i18n && pnpm check:pricing-leak`
   - `pnpm test`
   - `pnpm scan`
3. Ask the user for confirmation before committing and pushing the fix.
