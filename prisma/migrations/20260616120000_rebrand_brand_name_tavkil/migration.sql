-- [TSC-45] Rebrand: W-Sells -> Tavkil.
-- Data migration only: the brand.name seed lives in an earlier (immutable)
-- migration, so we update the stored value here instead of editing it.
UPDATE "system_settings"
SET value = '"Tavkil"'::jsonb
WHERE key = 'brand.name'
  AND value = '"W-Sells"'::jsonb;
