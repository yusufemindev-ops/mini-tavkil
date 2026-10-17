# AGENTS.md — mini-tavkil code repo (tool-agnostic)

Mirror of `CLAUDE.md` for non-Claude AI tools (Gemini / Antigravity, Cursor, Codex, ChatGPT, etc.).

## Special Rules for AI Assistants

- **No verbose or essay-length comments:** Keep comments to 1-2 lines maximum. Explain only non-obvious "why". Never write historical migration stories, debugging journals, or obvious comments.
- **Short commit messages:** Use `<type>: [TSC-XXX] <description>`, maximum 72 characters. Never write multi-line paragraphs in commits.
- **Never commit or push without asking:** Always ask the user for confirmation and get explicit permission before running `git commit` or `git push`.
- **Automatically watch CI pipelines after pushing:** Immediately after pushing to a PR branch, run `gh pr checks --watch` automatically and diagnose/fix any failing checks without waiting for the user to ask.
- **Red "Important — Read Me" section (only when critical):** Do NOT show this section on normal/routine results. Only include a red callout block (`> [!CAUTION]` with `### 🔴 Important — Read Me`) at the top of your response when there is:
  - Something critical the user **must** read
  - A design or product decision we need to make together
  - A risk, bug, or warning you caught that the user must know about
  - Manual action required from the user

---

@[CLAUDE.md](CLAUDE.md)
