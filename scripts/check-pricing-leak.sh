#!/usr/bin/env bash
# Curl public endpoints, grep response bodies for forbidden price-leaking strings.
# Run by lefthook pre-push + CI workflow `pricing-leak-check.yml`.
set -euo pipefail

STAGING="${1:-${STAGING_URL:-http://localhost:3000}}"

URLS=(
  "/en"
  "/tr"
  "/ar"
  "/en/catalogue"
  "/tr/catalogue"
  "/ar/catalogue"
  "/sitemap.xml"
  "/llms.txt"
  "/llms-full.txt"
)

FORBIDDEN=(
  "base_price"
  "basePrice"
  "tier_markup"
  "tierMarkup"
  "unit_price"
  "unitPrice"
  '"price":'
  "priceSpecification"
)

leaked=0
for url in "${URLS[@]}"; do
  body=$(curl -fsSL "${STAGING}${url}" 2>/dev/null || true)
  for term in "${FORBIDDEN[@]}"; do
    if grep -qF "$term" <<<"$body"; then
      echo "❌ LEAK: '$term' found at ${STAGING}${url}"
      leaked=1
    fi
  done
done

if [ "$leaked" = 1 ]; then
  echo ""
  echo "Pricing leak detected. Fix BEFORE merging."
  exit 1
fi
echo "✅ No pricing leaks detected on $STAGING"
