# /sync-branch

Sync `develop` with `origin/develop` and rebase or merge into the current feature branch.

## Steps

1. `git checkout develop`
2. `git pull --ff-only origin develop`
3. `git checkout -`
4. `git merge develop`
5. Run `pnpm install && pnpm typecheck && pnpm admin:typecheck`
