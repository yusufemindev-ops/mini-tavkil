-- CreateTable
CREATE TABLE "fx_rates" (
    "currency_code" CHAR(3) NOT NULL,
    "rate_to_usd" DECIMAL(12,6) NOT NULL,
    "fetched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("currency_code"),
    -- Display-only rate; a non-positive rate would break conversion. DB rejects it.
    CONSTRAINT "fx_rates_rate_to_usd_positive" CHECK ("rate_to_usd" > 0)
);

-- AddForeignKey
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed display-only FX rates (rate_to_usd = "1 USD = X of this currency").
-- Placeholder values with source 'seed'; the Phase-2 worker refreshes these daily
-- from government sources (TCMB/ECB/SAMA/CBUAE). Idempotent so it's safe to re-run.
INSERT INTO fx_rates (currency_code, rate_to_usd, source) VALUES
    ('USD', 1.000000, 'seed'),
    ('EUR', 0.920000, 'seed'),
    ('TRY', 46.850000, 'seed'),
    ('AED', 3.672500, 'seed'),
    ('SAR', 3.750000, 'seed')
ON CONFLICT (currency_code) DO NOTHING;

-- Starting currency set: offer USD, TRY, SAR on the storefront. EUR/AED stay as
-- reference data (rates kept) but inactive — an admin can enable them anytime
-- from Settings → Currencies.
UPDATE currencies SET is_active = false WHERE code IN ('EUR', 'AED');
