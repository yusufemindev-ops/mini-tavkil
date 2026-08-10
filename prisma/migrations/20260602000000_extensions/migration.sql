-- Required extensions must exist before any table uses their types.
-- citext: case-insensitive text, used for email columns (users, buyer_accounts, etc.)
CREATE EXTENSION IF NOT EXISTS "citext";
