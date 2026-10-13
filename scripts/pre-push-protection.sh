#!/usr/bin/env bash
# Block direct pushes to main and develop.
# All merges must go through PRs: feature → develop → main.
set -euo pipefail

branch=$(git rev-parse --abbrev-ref HEAD)

if [[ "$branch" == "main" || "$branch" == "develop" || "$branch" == "HEAD" ]]; then
  echo "❌ Direct push to '$branch' is not allowed — use a PR."
  echo ""
  echo "  Allowed flow:"
  echo "    feat/TSC-XXX-*  →  develop  (via PR)"
  echo "    develop         →  main     (via PR)"
  exit 1
fi

exit 0
