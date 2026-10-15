#!/usr/bin/env bash
# Validate branch name regex (matches CI branch-guard).
set -euo pipefail

branch=$(git rev-parse --abbrev-ref HEAD)

# Block direct push to main
if [[ "$branch" == "main" || "$branch" == "HEAD" ]]; then
  echo "❌ Don't push directly to main — open a PR."
  exit 1
fi

# Allow long-lived branches and bot branches
if [[ "$branch" == "develop" || "$branch" =~ ^dependabot/ ]]; then
  exit 0
fi

re='^(feat|fix|chore|refactor|perf|docs|test|build|ci)/TSC-[0-9]+-[a-z0-9-]+$'

if ! [[ "$branch" =~ $re ]]; then
  echo "❌ Branch name must match:  <type>/TSC-XXX-<kebab-description>"
  echo ""
  echo "  example:  feat/TSC-42-product-publish-gate"
  echo ""
  echo "  Got: $branch"
  exit 1
fi
