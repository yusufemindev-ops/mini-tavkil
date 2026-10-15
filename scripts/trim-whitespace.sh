#!/usr/bin/env bash
# Trim trailing whitespace from staged files (in place).
# Wired into lefthook pre-commit.
set -euo pipefail

for f in "$@"; do
  if [ -f "$f" ]; then
    # Use a temp file to avoid `sed -i` portability issues across macOS/Linux
    # Use -E for POSIX extended regex so `+` is one-or-more across BSD/macOS and GNU sed
    tmp=$(mktemp)
    sed -E 's/[[:space:]]+$//' "$f" > "$tmp"
    if ! cmp -s "$f" "$tmp"; then
      mv "$tmp" "$f"
      git add "$f"
      echo "  ✏️  trimmed: $f"
    else
      rm -f "$tmp"
    fi
  fi
done
