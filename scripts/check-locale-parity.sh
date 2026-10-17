#!/usr/bin/env bash
# Ensure messages/{en,tr,ar}.json have the same keys.
# Without this, a missing translation = silent fallback = SEO degradation.
set -euo pipefail

DIR=apps/storefront/messages

if [ ! -d "$DIR" ]; then
  exit 0
fi

cd "$DIR"
keys_en=$(jq -r 'paths(scalars) | map(tostring) | join(".")' en.json | sort)
fail=0
for locale in tr ar; do
  if [ ! -f "${locale}.json" ]; then
    echo "⚠️  ${locale}.json missing"
    fail=1
    continue
  fi
  keys_other=$(jq -r 'paths(scalars) | map(tostring) | join(".")' "${locale}.json" | sort)
  diff <(echo "$keys_en") <(echo "$keys_other") > /tmp/locale-diff-$$.txt 2>&1 || true
  if [ -s /tmp/locale-diff-$$.txt ]; then
    echo "❌ Locale parity broken: en vs ${locale}"
    cat /tmp/locale-diff-$$.txt
    fail=1
  fi
  rm -f /tmp/locale-diff-$$.txt
done

if [ "$fail" = 1 ]; then
  exit 1
fi
echo "✅ Locale parity OK (en/tr/ar)"
