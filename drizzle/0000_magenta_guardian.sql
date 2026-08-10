-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"domain" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"deprecated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locales" (
	"code" text PRIMARY KEY NOT NULL,
	"name_english" text NOT NULL,
	"name_native" text NOT NULL,
	"dir" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "locales_dir_check" CHECK (dir = ANY (ARRAY['ltr'::text, 'rtl'::text]))
);
--> statement-breakpoint
CREATE TABLE "account_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_email" "citext" NOT NULL,
	"phone" text,
	"job_title" text,
	"company" text,
	"company_website" text,
	"country_code" char(2) NOT NULL,
	"city" text,
	"intended_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"message" text,
	"locale" text NOT NULL,
	"captcha_score" numeric(3, 2),
	"ip_address" "inet",
	"user_agent" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_at" timestamp(3) with time zone,
	"rejection_reason" text,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"address" text,
	"created_buyer_auth_user_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"reviewed_by_auth_user_id" text,
	CONSTRAINT "account_requests_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_by_user_id" text,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"auth_method" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"before_state" jsonb,
	"after_state" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"impersonator_user_id" text,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "audit_log_actor_type_check" CHECK (actor_type = ANY (ARRAY['user'::text, 'buyer'::text, 'system'::text])),
	CONSTRAINT "audit_log_auth_method_check" CHECK ((auth_method IS NULL) OR (auth_method = ANY (ARRAY['password'::text, 'google'::text, 'session'::text, 'system'::text])))
);
--> statement-breakpoint
CREATE TABLE "authVerification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authSession" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	"impersonatedBy" text
);
--> statement-breakpoint
CREATE TABLE "authAccount" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp(3),
	"refreshTokenExpiresAt" timestamp(3),
	"scope" text,
	"password" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_profiles" (
	"auth_user_id" text PRIMARY KEY NOT NULL,
	"tier_markup_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authUser" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"banReason" text,
	"banExpires" timestamp(3),
	"userType" text DEFAULT 'buyer',
	"companyName" text,
	"contactName" text,
	"preferredLocale" text DEFAULT 'en',
	"address" text,
	"city" text,
	"country" text,
	"firstName" text,
	"jobTitle" text,
	"lastName" text,
	"phone" text,
	"verified" boolean DEFAULT false,
	"lastSeenAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "profile_edit_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"proposed_company" text,
	"proposed_phone" text,
	"proposed_job_title" text,
	"proposed_country" char(2),
	"proposed_city" text,
	"proposed_address" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_auth_user_id" text,
	"reviewed_at" timestamp(3) with time zone,
	"rejection_reason" text,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone NOT NULL,
	"proposed_first_name" text,
	"proposed_last_name" text
);
--> statement-breakpoint
CREATE TABLE "category_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"is_machine_translated" boolean DEFAULT false NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"is_machine_translated" boolean DEFAULT false NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"code" char(3) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"specs_md" text,
	"slug" text NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"is_machine_translated" boolean DEFAULT false NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"attr_name" text NOT NULL,
	"attr_value" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt_translations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" char(2) NOT NULL,
	"logo_url" text,
	"website" text,
	"contact_email_internal" text,
	"contact_phone_internal" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"internal_notes" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"address" text,
	"map_url" text
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid,
	"category_id" uuid,
	"sku" text,
	"moq" integer DEFAULT 1 NOT NULL,
	"box_quantity" integer,
	"unit" text DEFAULT 'piece' NOT NULL,
	"hs_code" text,
	"brand_name" text,
	"country_of_origin" char(2),
	"gtin13" text,
	"mpn" text,
	"base_price_amount" numeric(14, 4),
	"base_price_currency" char(3),
	"base_price_updated_at" timestamp(3) with time zone,
	"base_price_updated_by" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"cbm" numeric(10, 4),
	"weight_kg" numeric(10, 3),
	"pack_size" integer,
	"is_featured" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"image_url" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"sort_strategy" text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'chip' NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_option_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"label" text NOT NULL,
	"image_url" text,
	"color_hex" varchar(9),
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_request_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_request_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name_snapshot" text NOT NULL,
	"product_image_url_snapshot" text,
	"product_unit_snapshot" text NOT NULL,
	"product_moq_snapshot" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_base" numeric(14, 4) NOT NULL,
	"unit_price_final" numeric(14, 4),
	"line_subtotal" numeric(14, 4),
	"currency" char(3) NOT NULL,
	"buyer_note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"submitted_unit_price" numeric(14, 4),
	"selected_options" jsonb,
	CONSTRAINT "order_request_items_quantity_check" CHECK (quantity > 0)
);
--> statement-breakpoint
CREATE TABLE "order_number_sequence" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" text NOT NULL,
	"buyer_id" text NOT NULL,
	"locale" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"tier_markup_percent_at_submit" numeric(5, 2) NOT NULL,
	"submitted_subtotal_amount" numeric(14, 4) NOT NULL,
	"submitted_currency" char(3) NOT NULL,
	"confirmed_markup_percent" numeric(5, 2),
	"confirmed_subtotal_amount" numeric(14, 4),
	"confirmed_grand_total_amount" numeric(14, 4),
	"confirmed_currency" char(3),
	"confirmed_at" timestamp(3) with time zone,
	"confirmed_by_user_id" text,
	"notes_buyer" text,
	"notes_admin" text,
	"rejection_reason" text,
	"assigned_user_id" text,
	"submitted_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"accepted_at" timestamp(3) with time zone,
	"rejected_at" timestamp(3) with time zone,
	"expired_at" timestamp(3) with time zone,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	CONSTRAINT "order_requests_status_check" CHECK (status = ANY (ARRAY['submitted'::text, 'confirmed'::text, 'accepted'::text, 'rejected'::text, 'expired'::text]))
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"currency_code" char(3) PRIMARY KEY NOT NULL,
	"rate_to_usd" numeric(12, 6) NOT NULL,
	"fetched_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "fx_rates_rate_to_usd_positive" CHECK (rate_to_usd > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "fx_rate_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ran_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"status" text NOT NULL,
	"source" text,
	"error" text,
	"rates" jsonb
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text,
	"base_price_amount" numeric(14, 4),
	"base_price_currency" char(3),
	"base_price_updated_at" timestamp(3) with time zone,
	"base_price_updated_by" text,
	"moq" integer DEFAULT 1 NOT NULL,
	"pack_size" integer,
	"weight_kg" numeric(10, 3),
	"image_url" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variant_option_values" (
	"variant_id" uuid NOT NULL,
	"option_value_id" uuid NOT NULL,
	CONSTRAINT "product_variant_option_values_pkey" PRIMARY KEY("variant_id","option_value_id")
);
--> statement-breakpoint
CREATE TABLE "auth_user_roles" (
	"auth_user_id" text NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "auth_user_roles_pkey" PRIMARY KEY("auth_user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"granted_at" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"granted_by" text,
	CONSTRAINT "role_permissions_pkey" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
ALTER TABLE "account_requests" ADD CONSTRAINT "account_requests_locale_fkey" FOREIGN KEY ("locale") REFERENCES "public"."locales"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "authSession" ADD CONSTRAINT "authSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."authUser"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "authAccount" ADD CONSTRAINT "authAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."authUser"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "public"."authUser"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "profile_edit_requests" ADD CONSTRAINT "profile_edit_requests_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "public"."authUser"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "public"."locales"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supplier_translations" ADD CONSTRAINT "supplier_translations_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supplier_translations" ADD CONSTRAINT "supplier_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "public"."locales"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_locale_fkey" FOREIGN KEY ("locale") REFERENCES "public"."locales"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_locale_fkey" FOREIGN KEY ("locale") REFERENCES "public"."locales"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_base_price_currency_fkey" FOREIGN KEY ("base_price_currency") REFERENCES "public"."currencies"("code") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "public"."product_options"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "order_request_items" ADD CONSTRAINT "order_request_items_order_request_id_fkey" FOREIGN KEY ("order_request_id") REFERENCES "public"."order_requests"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "order_request_items" ADD CONSTRAINT "order_request_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "order_request_items" ADD CONSTRAINT "order_request_items_currency_fkey" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."authUser"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_confirmed_by_user_id_fkey" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."authUser"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."authUser"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_locale_fkey" FOREIGN KEY ("locale") REFERENCES "public"."locales"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_submitted_currency_fkey" FOREIGN KEY ("submitted_currency") REFERENCES "public"."currencies"("code") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_confirmed_currency_fkey" FOREIGN KEY ("confirmed_currency") REFERENCES "public"."currencies"("code") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_base_price_currency_fkey" FOREIGN KEY ("base_price_currency") REFERENCES "public"."currencies"("code") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_variant_option_values" ADD CONSTRAINT "product_variant_option_values_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_variant_option_values" ADD CONSTRAINT "product_variant_option_values_option_value_id_fkey" FOREIGN KEY ("option_value_id") REFERENCES "public"."product_option_values"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "auth_user_roles" ADD CONSTRAINT "auth_user_roles_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "public"."authUser"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "auth_user_roles" ADD CONSTRAINT "auth_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "roles_code_idx" ON "roles" USING btree ("code" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "roles_code_key" ON "roles" USING btree ("code" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "permissions_domain_idx" ON "permissions" USING btree ("domain" text_ops) WHERE (deprecated = false);--> statement-breakpoint
CREATE INDEX "account_requests_email_idx" ON "account_requests" USING btree ("business_email" citext_ops);--> statement-breakpoint
CREATE INDEX "account_requests_status_idx" ON "account_requests" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_type" text_ops,"actor_id" text_ops);--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "audit_log_impersonator_idx" ON "audit_log" USING btree ("impersonator_user_id" text_ops);--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("resource_type" text_ops,"resource_id" text_ops);--> statement-breakpoint
CREATE INDEX "authVerification_identifier_idx" ON "authVerification" USING btree ("identifier" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "authSession_token_key" ON "authSession" USING btree ("token" text_ops);--> statement-breakpoint
CREATE INDEX "authSession_userId_idx" ON "authSession" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE INDEX "authAccount_userId_idx" ON "authAccount" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "authUser_email_key" ON "authUser" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "profile_edit_requests_buyer_idx" ON "profile_edit_requests" USING btree ("auth_user_id" text_ops);--> statement-breakpoint
CREATE INDEX "profile_edit_requests_status_idx" ON "profile_edit_requests" USING btree ("status" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "category_translations_category_id_locale_key" ON "category_translations" USING btree ("category_id" text_ops,"locale" text_ops);--> statement-breakpoint
CREATE INDEX "category_translations_locale_idx" ON "category_translations" USING btree ("locale" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "category_translations_locale_slug_key" ON "category_translations" USING btree ("locale" text_ops,"slug" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_translations_locale_slug_key" ON "supplier_translations" USING btree ("locale" text_ops,"slug" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_translations_supplier_id_locale_key" ON "supplier_translations" USING btree ("supplier_id" uuid_ops,"locale" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "product_translations_locale_slug_key" ON "product_translations" USING btree ("locale" text_ops,"slug" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "product_translations_product_id_locale_key" ON "product_translations" USING btree ("product_id" uuid_ops,"locale" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "product_attributes_product_id_locale_attr_name_key" ON "product_attributes" USING btree ("product_id" text_ops,"locale" uuid_ops,"attr_name" uuid_ops);--> statement-breakpoint
CREATE INDEX "product_attributes_product_idx" ON "product_attributes" USING btree ("product_id" int4_ops,"locale" uuid_ops,"sort_order" uuid_ops);--> statement-breakpoint
CREATE INDEX "product_images_product_idx" ON "product_images" USING btree ("product_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "suppliers_country_idx" ON "suppliers" USING btree ("country_code" bpchar_ops);--> statement-breakpoint
CREATE INDEX "suppliers_status_idx" ON "suppliers" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "products_category_order_idx" ON "products" USING btree ("category_id" bool_ops,"is_featured" uuid_ops,"sort_order" uuid_ops);--> statement-breakpoint
CREATE INDEX "products_gtin13_idx" ON "products" USING btree ("gtin13" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_key" ON "products" USING btree ("sku" text_ops);--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "products_supplier_idx" ON "products" USING btree ("supplier_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "categories_status_idx" ON "categories" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "product_options_product_idx" ON "product_options" USING btree ("product_id" int4_ops,"sort_order" int4_ops);--> statement-breakpoint
CREATE INDEX "product_option_values_option_idx" ON "product_option_values" USING btree ("option_id" int4_ops,"sort_order" int4_ops);--> statement-breakpoint
CREATE INDEX "order_request_items_request_idx" ON "order_request_items" USING btree ("order_request_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "order_requests_assigned_idx" ON "order_requests" USING btree ("assigned_user_id" text_ops);--> statement-breakpoint
CREATE INDEX "order_requests_buyer_idx" ON "order_requests" USING btree ("buyer_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "order_requests_order_number_key" ON "order_requests" USING btree ("order_number" text_ops);--> statement-breakpoint
CREATE INDEX "order_requests_status_idx" ON "order_requests" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "order_requests_submitted_at_idx" ON "order_requests" USING btree ("submitted_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "fx_rate_runs_ran_at_idx" ON "fx_rate_runs" USING btree ("ran_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id" int4_ops,"sort_order" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants" USING btree ("sku" text_ops);--> statement-breakpoint
CREATE INDEX "pvov_value_idx" ON "product_variant_option_values" USING btree ("option_value_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "auth_user_roles_user_idx" ON "auth_user_roles" USING btree ("auth_user_id" text_ops);--> statement-breakpoint
CREATE INDEX "role_permissions_role_idx" ON "role_permissions" USING btree ("role_id" uuid_ops);
*/