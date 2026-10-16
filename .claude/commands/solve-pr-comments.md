# /solve-pr-comments [PR-number]

Address unresolved review comments on a GitHub PR:

1. Fetch unresolved review threads via `gh api`
2. Evaluate each comment (valid / minor / already addressed)
3. Present proposed fixes to the user and wait for confirmation
4. Apply approved fixes with minimal diffs
5. Run local verification (`pnpm lint`, `pnpm typecheck`, `pnpm admin:typecheck`, `pnpm test`)
6. Ask for confirmation before `git commit` and `git push`, then watch CI with `gh pr checks --watch`
