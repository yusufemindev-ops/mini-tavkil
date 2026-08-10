# /run-block [number]

Execute one block of the day-1 runbook.

## Steps

1. Read `DAY-1.md` and find block `$ARGUMENTS`. If no number was given, work out which
   block is next from git history and the current state of the repo, then say which one
   you picked before starting.

2. Read the rules that apply:
   - `CLAUDE.md` always
   - `.claude/skills/cloudflare-constraints.md` for blocks 0, 1, 6
   - `.claude/skills/port-nest-module.md` for blocks 2, 3
   - `.claude/skills/public-data-guard.md` + `seo-page.md` for block 4
   - `TESTING.md` if the block adds tests

3. State the block's goal, its time budget, and what you're about to do. One short
   paragraph, not a plan document.

4. Do the work. Source material is at `~/Documents/tavkil` — port, don't rewrite.
   Business logic comes across unchanged.

5. Verify before claiming done:
   - `pnpm tsc --noEmit`
   - `pnpm test` if tests exist yet
   - For blocks 4–6, actually load the page — use the Chrome DevTools MCP, don't assume
   - For block 6, check the bundle size wrangler reports

6. Report honestly: what landed, what didn't, what you cut. If the block ran over,
   say so — `DAY-1.md` rule 4 says cut this block's scope, never the next block's.

7. Commit with the block number in the message:
   `feat: [block N] <what landed>`
   Ask before committing — never commit unprompted.

## Rules for the day

- Delete nothing that isn't in the way. Hiding a nav entry is a minute; deleting a
  feature is an hour. Cleanup is week 2.
- Don't trim the Prisma schema. Unused tables cost nothing today.
- If block 0 hasn't passed, don't start block 1.
- Deploying at hour 9 with four working pages beats hour 13 with eight half-working ones.
