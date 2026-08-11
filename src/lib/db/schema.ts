import {
  pgTable,
  index,
  uniqueIndex,
  uuid,
  text,
  boolean,
  timestamp,
  check,
  integer,
  foreignKey,
  char,
  jsonb,
  numeric,
  inet,
  varchar,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { citext } from './citext';

export const roles = pgTable(
  'roles',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    code: text().notNull(),
    name: text().notNull(),
    description: text(),
    isSystem: boolean('is_system').default(false).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('roles_code_idx').using('btree', table.code.asc().nullsLast().op('text_ops')),
    uniqueIndex('roles_code_key').using('btree', table.code.asc().nullsLast().op('text_ops')),
  ],
);

export const permissions = pgTable(
  'permissions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    code: text().notNull(),
    domain: text().notNull(),
    name: text().notNull(),
    description: text(),
    deprecated: boolean().default(false).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('permissions_code_key').using('btree', table.code.asc().nullsLast().op('text_ops')),
    index('permissions_domain_idx')
      .using('btree', table.domain.asc().nullsLast().op('text_ops'))
      .where(sql`(deprecated = false)`),
  ],
);

export const locales = pgTable(
  'locales',
  {
    code: text().primaryKey().notNull(),
    nameEnglish: text('name_english').notNull(),
    nameNative: text('name_native').notNull(),
    dir: text().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [check('locales_dir_check', sql`dir = ANY (ARRAY['ltr'::text, 'rtl'::text])`)],
);

export const accountRequests = pgTable(
  'account_requests',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    businessEmail: citext('business_email').notNull(),
    phone: text(),
    jobTitle: text('job_title'),
    company: text(),
    companyWebsite: text('company_website'),
    countryCode: char('country_code', { length: 2 }).notNull(),
    city: text(),
    intendedCategories: jsonb('intended_categories').default([]).notNull(),
    message: text(),
    locale: text().notNull(),
    captchaScore: numeric('captcha_score', { precision: 3, scale: 2 }),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    status: text().default('pending').notNull(),
    reviewedAt: timestamp('reviewed_at', { precision: 3, withTimezone: true, mode: 'string' }),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    address: text(),
    createdBuyerAuthUserId: text('created_buyer_auth_user_id'),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    reviewedByAuthUserId: text('reviewed_by_auth_user_id'),
  },
  (table) => [
    index('account_requests_email_idx').using(
      'btree',
      table.businessEmail.asc().nullsLast().op('citext_ops'),
    ),
    index('account_requests_status_idx').using(
      'btree',
      table.status.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.locale],
      foreignColumns: [locales.code],
      name: 'account_requests_locale_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    check(
      'account_requests_status_check',
      sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])`,
    ),
  ],
);

export const systemSettings = pgTable('system_settings', {
  key: text().primaryKey().notNull(),
  value: jsonb().notNull(),
  description: text(),
  updatedByUserId: text('updated_by_user_id'),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    actorType: text('actor_type').notNull(),
    actorId: text('actor_id'),
    authMethod: text('auth_method'),
    action: text().notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    beforeState: jsonb('before_state'),
    afterState: jsonb('after_state'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    impersonatorUserId: text('impersonator_user_id'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('audit_log_actor_idx').using(
      'btree',
      table.actorType.asc().nullsLast().op('text_ops'),
      table.actorId.asc().nullsLast().op('text_ops'),
    ),
    index('audit_log_created_at_idx').using(
      'btree',
      table.createdAt.desc().nullsFirst().op('timestamptz_ops'),
    ),
    index('audit_log_impersonator_idx').using(
      'btree',
      table.impersonatorUserId.asc().nullsLast().op('text_ops'),
    ),
    index('audit_log_resource_idx').using(
      'btree',
      table.resourceType.asc().nullsLast().op('text_ops'),
      table.resourceId.asc().nullsLast().op('text_ops'),
    ),
    check(
      'audit_log_actor_type_check',
      sql`actor_type = ANY (ARRAY['user'::text, 'buyer'::text, 'system'::text])`,
    ),
    check(
      'audit_log_auth_method_check',
      sql`(auth_method IS NULL) OR (auth_method = ANY (ARRAY['password'::text, 'google'::text, 'session'::text, 'system'::text]))`,
    ),
  ],
);

/*
 * The four auth* tables use camelCase COLUMN names in Postgres — Tavkil's Prisma
 * models never mapped them, unlike every other table here, which is snake_case.
 *
 * That matters because src/lib/db.ts sets `casing: 'snake_case'`, which rewrites
 * any property that has no explicit column name. Every column below therefore
 * states its name outright: without it, `expiresAt` was being queried as
 * `expires_at`, which does not exist, and Google sign-in failed with a 500 on the
 * very first insert.
 */
export const authVerification = pgTable(
  'authVerification',
  {
    id: text().primaryKey().notNull(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'string' }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).notNull(),
  },
  (table) => [
    index('authVerification_identifier_idx').using(
      'btree',
      table.identifier.asc().nullsLast().op('text_ops'),
    ),
  ],
);

export const authSession = pgTable(
  'authSession',
  {
    id: text().primaryKey().notNull(),
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'string' }).notNull(),
    token: text().notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).notNull(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    userId: text('userId').notNull(),
    impersonatedBy: text('impersonatedBy'),
  },
  (table) => [
    uniqueIndex('authSession_token_key').using(
      'btree',
      table.token.asc().nullsLast().op('text_ops'),
    ),
    index('authSession_userId_idx').using('btree', table.userId.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUser.id],
      name: 'authSession_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const authAccount = pgTable(
  'authAccount',
  {
    id: text().primaryKey().notNull(),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    userId: text('userId').notNull(),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { precision: 3, mode: 'string' }),
    refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { precision: 3, mode: 'string' }),
    scope: text(),
    password: text(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).notNull(),
  },
  (table) => [
    index('authAccount_userId_idx').using('btree', table.userId.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUser.id],
      name: 'authAccount_userId_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const buyerProfiles = pgTable(
  'buyer_profiles',
  {
    authUserId: text('auth_user_id').primaryKey().notNull(),
    tierMarkupPercent: numeric('tier_markup_percent', { precision: 5, scale: 2 })
      .default('0')
      .notNull(),
    notes: text(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      withTimezone: true,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.authUserId],
      foreignColumns: [authUser.id],
      name: 'buyer_profiles_auth_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const authUser = pgTable(
  'authUser',
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean('emailVerified').default(false).notNull(),
    image: text(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).notNull(),
    role: text(),
    banned: boolean().default(false),
    banReason: text('banReason'),
    banExpires: timestamp('banExpires', { precision: 3, mode: 'string' }),
    userType: text('userType').default('buyer'),
    companyName: text('companyName'),
    contactName: text('contactName'),
    preferredLocale: text('preferredLocale').default('en'),
    address: text(),
    city: text(),
    country: text(),
    firstName: text('firstName'),
    jobTitle: text('jobTitle'),
    lastName: text('lastName'),
    phone: text(),
    verified: boolean().default(false),
    lastSeenAt: timestamp('lastSeenAt', { precision: 3, mode: 'string' }),
  },
  (table) => [
    uniqueIndex('authUser_email_key').using('btree', table.email.asc().nullsLast().op('text_ops')),
  ],
);

export const profileEditRequests = pgTable(
  'profile_edit_requests',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    authUserId: text('auth_user_id').notNull(),
    proposedCompany: text('proposed_company'),
    proposedPhone: text('proposed_phone'),
    proposedJobTitle: text('proposed_job_title'),
    proposedCountry: char('proposed_country', { length: 2 }),
    proposedCity: text('proposed_city'),
    proposedAddress: text('proposed_address'),
    status: text().default('pending').notNull(),
    reviewedByAuthUserId: text('reviewed_by_auth_user_id'),
    reviewedAt: timestamp('reviewed_at', { precision: 3, withTimezone: true, mode: 'string' }),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    proposedFirstName: text('proposed_first_name'),
    proposedLastName: text('proposed_last_name'),
  },
  (table) => [
    index('profile_edit_requests_buyer_idx').using(
      'btree',
      table.authUserId.asc().nullsLast().op('text_ops'),
    ),
    index('profile_edit_requests_status_idx').using(
      'btree',
      table.status.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.authUserId],
      foreignColumns: [authUser.id],
      name: 'profile_edit_requests_auth_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const categoryTranslations = pgTable(
  'category_translations',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    categoryId: uuid('category_id').notNull(),
    locale: text().notNull(),
    name: text().notNull(),
    description: text(),
    slug: text().notNull(),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    isMachineTranslated: boolean('is_machine_translated').default(false).notNull(),
    isComplete: boolean('is_complete').default(false).notNull(),
  },
  (table) => [
    uniqueIndex('category_translations_category_id_locale_key').using(
      'btree',
      table.categoryId.asc().nullsLast().op('text_ops'),
      table.locale.asc().nullsLast().op('text_ops'),
    ),
    index('category_translations_locale_idx').using(
      'btree',
      table.locale.asc().nullsLast().op('text_ops'),
    ),
    uniqueIndex('category_translations_locale_slug_key').using(
      'btree',
      table.locale.asc().nullsLast().op('text_ops'),
      table.slug.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: 'category_translations_category_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.locale],
      foreignColumns: [locales.code],
      name: 'category_translations_locale_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);

export const supplierTranslations = pgTable(
  'supplier_translations',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    supplierId: uuid('supplier_id').notNull(),
    locale: text().notNull(),
    name: text().notNull(),
    description: text(),
    slug: text().notNull(),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    isMachineTranslated: boolean('is_machine_translated').default(false).notNull(),
    isComplete: boolean('is_complete').default(false).notNull(),
  },
  (table) => [
    uniqueIndex('supplier_translations_locale_slug_key').using(
      'btree',
      table.locale.asc().nullsLast().op('text_ops'),
      table.slug.asc().nullsLast().op('text_ops'),
    ),
    uniqueIndex('supplier_translations_supplier_id_locale_key').using(
      'btree',
      table.supplierId.asc().nullsLast().op('uuid_ops'),
      table.locale.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.supplierId],
      foreignColumns: [suppliers.id],
      name: 'supplier_translations_supplier_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.locale],
      foreignColumns: [locales.code],
      name: 'supplier_translations_locale_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);

export const currencies = pgTable('currencies', {
  code: char({ length: 3 }).primaryKey().notNull(),
  name: text().notNull(),
  symbol: text().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const productTranslations = pgTable(
  'product_translations',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    productId: uuid('product_id').notNull(),
    locale: text().notNull(),
    name: text().notNull(),
    description: text(),
    specsMd: text('specs_md'),
    slug: text().notNull(),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    isMachineTranslated: boolean('is_machine_translated').default(false).notNull(),
    isComplete: boolean('is_complete').default(false).notNull(),
  },
  (table) => [
    uniqueIndex('product_translations_locale_slug_key').using(
      'btree',
      table.locale.asc().nullsLast().op('text_ops'),
      table.slug.asc().nullsLast().op('text_ops'),
    ),
    uniqueIndex('product_translations_product_id_locale_key').using(
      'btree',
      table.productId.asc().nullsLast().op('uuid_ops'),
      table.locale.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'product_translations_product_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.locale],
      foreignColumns: [locales.code],
      name: 'product_translations_locale_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);

export const productAttributes = pgTable(
  'product_attributes',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    productId: uuid('product_id').notNull(),
    locale: text().notNull(),
    attrName: text('attr_name').notNull(),
    attrValue: text('attr_value').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [
    uniqueIndex('product_attributes_product_id_locale_attr_name_key').using(
      'btree',
      table.productId.asc().nullsLast().op('text_ops'),
      table.locale.asc().nullsLast().op('uuid_ops'),
      table.attrName.asc().nullsLast().op('uuid_ops'),
    ),
    index('product_attributes_product_idx').using(
      'btree',
      table.productId.asc().nullsLast().op('int4_ops'),
      table.locale.asc().nullsLast().op('uuid_ops'),
      table.sortOrder.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'product_attributes_product_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.locale],
      foreignColumns: [locales.code],
      name: 'product_attributes_locale_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
  ],
);

export const productImages = pgTable(
  'product_images',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    productId: uuid('product_id').notNull(),
    url: text().notNull(),
    altTranslations: jsonb('alt_translations').default({}).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('product_images_product_idx').using(
      'btree',
      table.productId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'product_images_product_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const suppliers = pgTable(
  'suppliers',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    countryCode: char('country_code', { length: 2 }).notNull(),
    logoUrl: text('logo_url'),
    website: text(),
    contactEmailInternal: text('contact_email_internal'),
    contactPhoneInternal: text('contact_phone_internal'),
    isVerified: boolean('is_verified').default(false).notNull(),
    internalNotes: text('internal_notes'),
    status: text().default('draft').notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true, mode: 'string' }),
    address: text(),
    mapUrl: text('map_url'),
  },
  (table) => [
    index('suppliers_country_idx').using(
      'btree',
      table.countryCode.asc().nullsLast().op('bpchar_ops'),
    ),
    index('suppliers_status_idx').using('btree', table.status.asc().nullsLast().op('text_ops')),
  ],
);

export const products = pgTable(
  'products',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    supplierId: uuid('supplier_id'),
    categoryId: uuid('category_id'),
    sku: text(),
    moq: integer().default(1).notNull(),
    boxQuantity: integer('box_quantity'),
    unit: text().default('piece').notNull(),
    hsCode: text('hs_code'),
    brandName: text('brand_name'),
    countryOfOrigin: char('country_of_origin', { length: 2 }),
    gtin13: text(),
    mpn: text(),
    basePriceAmount: numeric('base_price_amount', { precision: 14, scale: 4 }),
    basePriceCurrency: char('base_price_currency', { length: 3 }),
    basePriceUpdatedAt: timestamp('base_price_updated_at', {
      precision: 3,
      withTimezone: true,
      mode: 'string',
    }),
    basePriceUpdatedBy: text('base_price_updated_by'),
    status: text().default('draft').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true, mode: 'string' }),
    cbm: numeric({ precision: 10, scale: 4 }),
    weightKg: numeric('weight_kg', { precision: 10, scale: 3 }),
    packSize: integer('pack_size'),
    isFeatured: boolean('is_featured').default(false).notNull(),
  },
  (table) => [
    index('products_category_idx').using(
      'btree',
      table.categoryId.asc().nullsLast().op('uuid_ops'),
    ),
    index('products_category_order_idx').using(
      'btree',
      table.categoryId.asc().nullsLast().op('bool_ops'),
      table.isFeatured.asc().nullsLast().op('uuid_ops'),
      table.sortOrder.asc().nullsLast().op('uuid_ops'),
    ),
    index('products_gtin13_idx').using('btree', table.gtin13.asc().nullsLast().op('text_ops')),
    uniqueIndex('products_sku_key').using('btree', table.sku.asc().nullsLast().op('text_ops')),
    index('products_status_idx').using('btree', table.status.asc().nullsLast().op('text_ops')),
    index('products_supplier_idx').using(
      'btree',
      table.supplierId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.basePriceCurrency],
      foreignColumns: [currencies.code],
      name: 'products_base_price_currency_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.supplierId],
      foreignColumns: [suppliers.id],
      name: 'products_supplier_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: 'products_category_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
  ],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    parentId: uuid('parent_id'),
    imageUrl: text('image_url'),
    displayOrder: integer('display_order').default(0).notNull(),
    status: text().default('draft').notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true, mode: 'string' }),
    sortStrategy: text('sort_strategy').default('manual').notNull(),
  },
  (table) => [
    index('categories_parent_idx').using('btree', table.parentId.asc().nullsLast().op('uuid_ops')),
    index('categories_status_idx').using('btree', table.status.asc().nullsLast().op('text_ops')),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'categories_parent_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
  ],
);

export const productOptions = pgTable(
  'product_options',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    productId: uuid('product_id').notNull(),
    name: text().notNull(),
    type: text().default('chip').notNull(),
    isVisible: boolean('is_visible').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [
    index('product_options_product_idx').using(
      'btree',
      table.productId.asc().nullsLast().op('int4_ops'),
      table.sortOrder.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'product_options_product_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const productOptionValues = pgTable(
  'product_option_values',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    optionId: uuid('option_id').notNull(),
    label: text().notNull(),
    imageUrl: text('image_url'),
    colorHex: varchar('color_hex', { length: 9 }),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [
    index('product_option_values_option_idx').using(
      'btree',
      table.optionId.asc().nullsLast().op('int4_ops'),
      table.sortOrder.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.optionId],
      foreignColumns: [productOptions.id],
      name: 'product_option_values_option_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const orderRequestItems = pgTable(
  'order_request_items',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    orderRequestId: uuid('order_request_id').notNull(),
    productId: uuid('product_id').notNull(),
    productNameSnapshot: text('product_name_snapshot').notNull(),
    productImageUrlSnapshot: text('product_image_url_snapshot'),
    productUnitSnapshot: text('product_unit_snapshot').notNull(),
    productMoqSnapshot: integer('product_moq_snapshot').notNull(),
    quantity: integer().notNull(),
    unitPriceBase: numeric('unit_price_base', { precision: 14, scale: 4 }).notNull(),
    unitPriceFinal: numeric('unit_price_final', { precision: 14, scale: 4 }),
    lineSubtotal: numeric('line_subtotal', { precision: 14, scale: 4 }),
    currency: char({ length: 3 }).notNull(),
    buyerNote: text('buyer_note'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    submittedUnitPrice: numeric('submitted_unit_price', { precision: 14, scale: 4 }),
    selectedOptions: jsonb('selected_options'),
  },
  (table) => [
    index('order_request_items_request_idx').using(
      'btree',
      table.orderRequestId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.orderRequestId],
      foreignColumns: [orderRequests.id],
      name: 'order_request_items_order_request_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'order_request_items_product_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.currency],
      foreignColumns: [currencies.code],
      name: 'order_request_items_currency_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    check('order_request_items_quantity_check', sql`quantity > 0`),
  ],
);

export const orderNumberSequence = pgTable('order_number_sequence', {
  year: integer().primaryKey().notNull(),
  lastNumber: integer('last_number').default(0).notNull(),
});

export const orderRequests = pgTable(
  'order_requests',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    orderNumber: text('order_number').notNull(),
    buyerId: text('buyer_id').notNull(),
    locale: text().notNull(),
    status: text().default('submitted').notNull(),
    tierMarkupPercentAtSubmit: numeric('tier_markup_percent_at_submit', {
      precision: 5,
      scale: 2,
    }).notNull(),
    submittedSubtotalAmount: numeric('submitted_subtotal_amount', {
      precision: 14,
      scale: 4,
    }).notNull(),
    submittedCurrency: char('submitted_currency', { length: 3 }).notNull(),
    confirmedMarkupPercent: numeric('confirmed_markup_percent', { precision: 5, scale: 2 }),
    confirmedSubtotalAmount: numeric('confirmed_subtotal_amount', { precision: 14, scale: 4 }),
    confirmedGrandTotalAmount: numeric('confirmed_grand_total_amount', { precision: 14, scale: 4 }),
    confirmedCurrency: char('confirmed_currency', { length: 3 }),
    confirmedAt: timestamp('confirmed_at', { precision: 3, withTimezone: true, mode: 'string' }),
    confirmedByUserId: text('confirmed_by_user_id'),
    notesBuyer: text('notes_buyer'),
    notesAdmin: text('notes_admin'),
    rejectionReason: text('rejection_reason'),
    assignedUserId: text('assigned_user_id'),
    submittedAt: timestamp('submitted_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    acceptedAt: timestamp('accepted_at', { precision: 3, withTimezone: true, mode: 'string' }),
    rejectedAt: timestamp('rejected_at', { precision: 3, withTimezone: true, mode: 'string' }),
    expiredAt: timestamp('expired_at', { precision: 3, withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('order_requests_assigned_idx').using(
      'btree',
      table.assignedUserId.asc().nullsLast().op('text_ops'),
    ),
    index('order_requests_buyer_idx').using(
      'btree',
      table.buyerId.asc().nullsLast().op('text_ops'),
    ),
    uniqueIndex('order_requests_order_number_key').using(
      'btree',
      table.orderNumber.asc().nullsLast().op('text_ops'),
    ),
    index('order_requests_status_idx').using(
      'btree',
      table.status.asc().nullsLast().op('text_ops'),
    ),
    index('order_requests_submitted_at_idx').using(
      'btree',
      table.submittedAt.desc().nullsFirst().op('timestamptz_ops'),
    ),
    foreignKey({
      columns: [table.buyerId],
      foreignColumns: [authUser.id],
      name: 'order_requests_buyer_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.confirmedByUserId],
      foreignColumns: [authUser.id],
      name: 'order_requests_confirmed_by_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.assignedUserId],
      foreignColumns: [authUser.id],
      name: 'order_requests_assigned_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.locale],
      foreignColumns: [locales.code],
      name: 'order_requests_locale_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.submittedCurrency],
      foreignColumns: [currencies.code],
      name: 'order_requests_submitted_currency_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.confirmedCurrency],
      foreignColumns: [currencies.code],
      name: 'order_requests_confirmed_currency_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    check(
      'order_requests_status_check',
      sql`status = ANY (ARRAY['submitted'::text, 'confirmed'::text, 'accepted'::text, 'rejected'::text, 'expired'::text])`,
    ),
  ],
);

export const fxRates = pgTable(
  'fx_rates',
  {
    currencyCode: char('currency_code', { length: 3 }).primaryKey().notNull(),
    rateToUsd: numeric('rate_to_usd', { precision: 12, scale: 6 }).notNull(),
    fetchedAt: timestamp('fetched_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    source: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.currencyCode],
      foreignColumns: [currencies.code],
      name: 'fx_rates_currency_code_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    check('fx_rates_rate_to_usd_positive', sql`rate_to_usd > (0)::numeric`),
  ],
);

export const fxRateRuns = pgTable(
  'fx_rate_runs',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ranAt: timestamp('ran_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    status: text().notNull(),
    source: text(),
    error: text(),
    rates: jsonb(),
  },
  (table) => [
    index('fx_rate_runs_ran_at_idx').using(
      'btree',
      table.ranAt.asc().nullsLast().op('timestamptz_ops'),
    ),
  ],
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    productId: uuid('product_id').notNull(),
    sku: text(),
    basePriceAmount: numeric('base_price_amount', { precision: 14, scale: 4 }),
    basePriceCurrency: char('base_price_currency', { length: 3 }),
    basePriceUpdatedAt: timestamp('base_price_updated_at', {
      precision: 3,
      withTimezone: true,
      mode: 'string',
    }),
    basePriceUpdatedBy: text('base_price_updated_by'),
    moq: integer().default(1).notNull(),
    packSize: integer('pack_size'),
    weightKg: numeric('weight_kg', { precision: 10, scale: 3 }),
    imageUrl: text('image_url'),
    isDefault: boolean('is_default').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('product_variants_product_idx').using(
      'btree',
      table.productId.asc().nullsLast().op('int4_ops'),
      table.sortOrder.asc().nullsLast().op('int4_ops'),
    ),
    uniqueIndex('product_variants_sku_key').using(
      'btree',
      table.sku.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: 'product_variants_product_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.basePriceCurrency],
      foreignColumns: [currencies.code],
      name: 'product_variants_base_price_currency_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
  ],
);

export const productVariantOptionValues = pgTable(
  'product_variant_option_values',
  {
    variantId: uuid('variant_id').notNull(),
    optionValueId: uuid('option_value_id').notNull(),
  },
  (table) => [
    index('pvov_value_idx').using('btree', table.optionValueId.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.variantId],
      foreignColumns: [productVariants.id],
      name: 'product_variant_option_values_variant_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.optionValueId],
      foreignColumns: [productOptionValues.id],
      name: 'product_variant_option_values_option_value_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    primaryKey({
      columns: [table.variantId, table.optionValueId],
      name: 'product_variant_option_values_pkey',
    }),
  ],
);

export const authUserRoles = pgTable(
  'auth_user_roles',
  {
    authUserId: text('auth_user_id').notNull(),
    roleId: uuid('role_id').notNull(),
    assignedAt: timestamp('assigned_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('auth_user_roles_user_idx').using(
      'btree',
      table.authUserId.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.authUserId],
      foreignColumns: [authUser.id],
      name: 'auth_user_roles_auth_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: 'auth_user_roles_role_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    primaryKey({ columns: [table.authUserId, table.roleId], name: 'auth_user_roles_pkey' }),
  ],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id').notNull(),
    permissionId: uuid('permission_id').notNull(),
    grantedAt: timestamp('granted_at', { precision: 3, withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    grantedBy: text('granted_by'),
  },
  (table) => [
    index('role_permissions_role_idx').using(
      'btree',
      table.roleId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: 'role_permissions_role_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.permissionId],
      foreignColumns: [permissions.id],
      name: 'role_permissions_permission_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    primaryKey({ columns: [table.roleId, table.permissionId], name: 'role_permissions_pkey' }),
  ],
);
