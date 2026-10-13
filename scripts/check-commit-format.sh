#!/usr/bin/env bash
# Validate conventional-commit format: `<type>: [TSC-XXX] <description>`
set -euo pipefail

msg_file="$1"
msg=$(head -1 "$msg_file")

re='^(feat|fix|chore|refactor|perf|docs|test|build|ci): \[TSC-[0-9]+\] .+$'

if ! [[ "$msg" =~ $re ]]; then
  echo "❌ Commit message must match:  <type>: [TSC-XXX] <description>"
  echo ""
  echo "  type ∈ feat | fix | chore | refactor | perf | docs | test | build | ci"
  echo "  example:  feat: [TSC-42] add product publish-gate validation"
  echo ""
  echo "  Got: $msg"
  exit 1
fi
