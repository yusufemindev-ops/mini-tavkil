-- Seed the supported currencies (reference data, per db-schema.md §5.2).
-- Idempotent so it's safe to re-run / apply on any environment.
INSERT INTO currencies (code, name, symbol, sort_order) VALUES
    ('USD', 'US Dollar', '$', 1),
    ('EUR', 'Euro', '€', 2),
    ('TRY', 'Turkish Lira', '₺', 3),
    ('AED', 'UAE Dirham', 'د.إ', 4),
    ('SAR', 'Saudi Riyal', '﷼', 5)
ON CONFLICT (code) DO NOTHING;
