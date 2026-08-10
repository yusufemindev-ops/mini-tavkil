-- ─── CHECK Constraints ────────────────────────────────────────────────────

ALTER TABLE "users"
  ADD CONSTRAINT "users_auth_method_check"
    CHECK (auth_method IN ('password','google','both')),
  ADD CONSTRAINT "users_password_or_google"
    CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL);

ALTER TABLE "buyer_accounts"
  ADD CONSTRAINT "buyer_accounts_auth_method_check"
    CHECK (auth_method IN ('password','google','both')),
  ADD CONSTRAINT "buyer_accounts_status_check"
    CHECK (status IN ('invited','active','suspended')),
  ADD CONSTRAINT "buyer_accounts_password_or_google"
    CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL);

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_subject_type_check"
    CHECK (subject_type IN ('user','buyer'));

ALTER TABLE "locales"
  ADD CONSTRAINT "locales_dir_check"
    CHECK (dir IN ('ltr','rtl'));

ALTER TABLE "categories"
  ADD CONSTRAINT "categories_status_check"
    CHECK (status IN ('draft','published','archived'));

ALTER TABLE "suppliers"
  ADD CONSTRAINT "suppliers_status_check"
    CHECK (status IN ('draft','published','archived'));

ALTER TABLE "products"
  ADD CONSTRAINT "products_status_check"
    CHECK (status IN ('draft','published','archived')),
  ADD CONSTRAINT "products_base_price_pair"
    CHECK (
      (base_price_amount IS NULL AND base_price_currency IS NULL)
      OR
      (base_price_amount IS NOT NULL AND base_price_currency IS NOT NULL)
    ),
  ADD CONSTRAINT "products_gtin13_format"
    CHECK (gtin13 IS NULL OR gtin13 ~ '^[0-9]{13}$'),
  ADD CONSTRAINT "products_country_iso2"
    CHECK (country_of_origin IS NULL OR country_of_origin ~ '^[A-Z]{2}$');

ALTER TABLE "auth_bootstrap"
  ADD CONSTRAINT "auth_bootstrap_singleton"
    CHECK (id = 1);

ALTER TABLE "account_requests"
  ADD CONSTRAINT "account_requests_status_check"
    CHECK (status IN ('pending','approved','rejected'));

ALTER TABLE "contact_messages"
  ADD CONSTRAINT "contact_messages_topic_check"
    CHECK (topic IN ('general_inquiry','sourcing_request','partnership','support','press','other')),
  ADD CONSTRAINT "contact_messages_status_check"
    CHECK (status IN ('unread','replied','archived','spam'));

ALTER TABLE "order_requests"
  ADD CONSTRAINT "order_requests_status_check"
    CHECK (status IN ('submitted','confirmed','accepted','rejected','expired'));

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_recipient_type_check"
    CHECK (recipient_type IN ('user','buyer')),
  ADD CONSTRAINT "notifications_channel_check"
    CHECK (channel IN ('in_app','email','both'));

ALTER TABLE "email_queue"
  ADD CONSTRAINT "email_queue_status_check"
    CHECK (status IN ('queued','sent','failed','dead'));

ALTER TABLE "audit_log"
  ADD CONSTRAINT "audit_log_actor_type_check"
    CHECK (actor_type IN ('user','buyer','system')),
  ADD CONSTRAINT "audit_log_auth_method_check"
    CHECK (auth_method IS NULL OR auth_method IN ('password','google','session','system'));

ALTER TABLE "impersonation_sessions"
  ADD CONSTRAINT "impersonation_sessions_end_reason_check"
    CHECK (end_reason IS NULL OR end_reason IN ('manual','timeout','admin_force')),
  ADD CONSTRAINT "impersonation_sessions_reason_length"
    CHECK (length(reason) >= 10);

ALTER TABLE "media"
  ADD CONSTRAINT "media_type_check"
    CHECK (type IN ('image','document','other'));

ALTER TABLE "fx_rates"
  ADD CONSTRAINT "fx_rates_rate_positive"
    CHECK (rate_to_usd > 0);

-- ─── Partial indexes (WHERE deleted_at IS NULL) ────────────────────────────

DROP INDEX IF EXISTS "users_active_idx";
CREATE INDEX "users_active_idx" ON "users"(is_active) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS "users_google_sub_idx";
CREATE INDEX "users_google_sub_idx" ON "users"(google_sub) WHERE google_sub IS NOT NULL;

DROP INDEX IF EXISTS "buyer_accounts_status_idx";
CREATE INDEX "buyer_accounts_status_idx" ON "buyer_accounts"(status) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS "buyer_accounts_country_idx";
CREATE INDEX "buyer_accounts_country_idx" ON "buyer_accounts"(country_code) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS "buyer_accounts_google_sub_idx";
CREATE INDEX "buyer_accounts_google_sub_idx" ON "buyer_accounts"(google_sub) WHERE google_sub IS NOT NULL;

DROP INDEX IF EXISTS "user_sessions_user_id_idx";
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"(user_id) WHERE revoked_at IS NULL;

DROP INDEX IF EXISTS "buyer_sessions_buyer_idx";
CREATE INDEX "buyer_sessions_buyer_idx" ON "buyer_sessions"(buyer_account_id) WHERE revoked_at IS NULL;

DROP INDEX IF EXISTS "categories_parent_idx";
CREATE INDEX "categories_parent_idx" ON "categories"(parent_id) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS "categories_status_idx";
CREATE INDEX "categories_status_idx" ON "categories"(status) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS "suppliers_country_idx";
CREATE INDEX "suppliers_country_idx" ON "suppliers"(country_code) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS "suppliers_status_idx";
CREATE INDEX "suppliers_status_idx" ON "suppliers"(status) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS "products_supplier_idx";
CREATE INDEX "products_supplier_idx" ON "products"(supplier_id) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS "products_category_idx";
CREATE INDEX "products_category_idx" ON "products"(category_id) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS "products_status_idx";
CREATE INDEX "products_status_idx" ON "products"(status) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS "products_gtin13_idx";
CREATE INDEX "products_gtin13_idx" ON "products"(gtin13) WHERE gtin13 IS NOT NULL;

DROP INDEX IF EXISTS "permissions_domain_idx";
CREATE INDEX "permissions_domain_idx" ON "permissions"(domain) WHERE deprecated = false;

DROP INDEX IF EXISTS "order_requests_status_idx";
CREATE INDEX "order_requests_status_idx" ON "order_requests"(status) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS "order_requests_assigned_idx";
CREATE INDEX "order_requests_assigned_idx" ON "order_requests"(assigned_user_id) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS "impersonation_sessions_active_idx";
CREATE INDEX "impersonation_sessions_active_idx" ON "impersonation_sessions"(impersonator_user_id) WHERE ended_at IS NULL;

-- ─── FTS index ────────────────────────────────────────────────────────────

CREATE INDEX "product_translations_fts_idx"
  ON "product_translations"
  USING gin(to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,'')));

-- ─── Unique partial index (one primary image per product) ─────────────────

CREATE UNIQUE INDEX "product_images_one_primary"
  ON "product_images"(product_id) WHERE is_primary = true;

-- ─── updated_at trigger ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_buyer_accounts_updated_at BEFORE UPDATE ON "buyer_accounts"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON "roles"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON "categories"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON "suppliers"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON "products"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_carts_updated_at BEFORE UPDATE ON "carts"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cart_items_updated_at BEFORE UPDATE ON "cart_items"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_order_requests_updated_at BEFORE UPDATE ON "order_requests"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_order_request_items_updated_at BEFORE UPDATE ON "order_request_items"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Order number generator ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION next_order_number() RETURNS TEXT AS $$
DECLARE
    yr  INT := EXTRACT(YEAR FROM now());
    seq INT;
BEGIN
    INSERT INTO order_number_sequence(year, last_number) VALUES (yr, 1)
    ON CONFLICT (year) DO UPDATE
        SET last_number = order_number_sequence.last_number + 1
    RETURNING last_number INTO seq;
    RETURN 'O-' || yr::text || '-' || lpad(seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── Immutable audit_log ──────────────────────────────────────────────────

REVOKE UPDATE, DELETE ON "audit_log" FROM PUBLIC;

-- ─── Seed: locales ────────────────────────────────────────────────────────

INSERT INTO "locales" (code, name_english, name_native, dir, is_default, sort_order) VALUES
    ('en', 'English', 'English',    'ltr', true,  1),
    ('tr', 'Turkish', 'Türkçe',     'ltr', false, 2),
    ('ar', 'Arabic',  'العربية',    'rtl', false, 3)
ON CONFLICT (code) DO NOTHING;

-- ─── Seed: currencies ─────────────────────────────────────────────────────

INSERT INTO "currencies" (code, name, symbol, sort_order) VALUES
    ('USD', 'US Dollar',   '$',   1),
    ('EUR', 'Euro',        '€',   2),
    ('TRY', 'Turkish Lira','₺',   3),
    ('AED', 'UAE Dirham',  'د.إ', 4),
    ('SAR', 'Saudi Riyal', '﷼',   5)
ON CONFLICT (code) DO NOTHING;

-- ─── Seed: auth_bootstrap ─────────────────────────────────────────────────

INSERT INTO "auth_bootstrap" (id, bootstrapped) VALUES (1, false)
ON CONFLICT DO NOTHING;

-- ─── Seed: roles ──────────────────────────────────────────────────────────

INSERT INTO "roles" (id, code, name, description, is_system) VALUES
    (gen_random_uuid(), 'super_admin',      'Super Admin',      'Full access to all features and settings',             true),
    (gen_random_uuid(), 'catalog_manager',  'Catalog Manager',  'Manages products, categories, suppliers, translations', true),
    (gen_random_uuid(), 'order_operator',   'Order Operator',   'Processes and manages buyer order requests',            true),
    (gen_random_uuid(), 'member',           'Member',           'Read-only admin access',                               true),
    (gen_random_uuid(), 'buyer',            'Buyer',            'Storefront buyer (implicit role, not assignable)',      true)
ON CONFLICT (code) DO NOTHING;

-- ─── Seed: system_settings ────────────────────────────────────────────────

INSERT INTO "system_settings" (key, value, description) VALUES
    ('brand.name',                      '"W-Sells"',    'Product brand name shown in storefront and admin'),
    ('brand.logo_url',                  '"/static/logo.svg"', 'Logo path used in admin shell and order detail headers'),
    ('order.auto_expire_days',          '30',           'Days after submission before an unresolved order auto-expires'),
    ('buyer.default_tier_markup_percent', '20.00',      'Default markup % assigned to new buyer accounts'),
    ('order.number_prefix',             '"O-"',         'Prefix for order numbers (e.g., O-2026-0001)'),
    ('seo.default_locale',              '"en"',         'Default locale for SEO defaults and fallbacks')
ON CONFLICT (key) DO NOTHING;
