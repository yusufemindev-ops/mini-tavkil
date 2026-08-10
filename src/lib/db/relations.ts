import { relations } from 'drizzle-orm/relations';
import {
  locales,
  accountRequests,
  authUser,
  authSession,
  authAccount,
  buyerProfiles,
  profileEditRequests,
  categories,
  categoryTranslations,
  suppliers,
  supplierTranslations,
  products,
  productTranslations,
  productAttributes,
  productImages,
  currencies,
  productOptions,
  productOptionValues,
  orderRequests,
  orderRequestItems,
  fxRates,
  productVariants,
  productVariantOptionValues,
  authUserRoles,
  roles,
  rolePermissions,
  permissions,
} from './schema';

export const accountRequestsRelations = relations(accountRequests, ({ one }) => ({
  locale: one(locales, {
    fields: [accountRequests.locale],
    references: [locales.code],
  }),
}));

export const localesRelations = relations(locales, ({ many }) => ({
  accountRequests: many(accountRequests),
  categoryTranslations: many(categoryTranslations),
  supplierTranslations: many(supplierTranslations),
  productTranslations: many(productTranslations),
  productAttributes: many(productAttributes),
  orderRequests: many(orderRequests),
}));

export const authSessionRelations = relations(authSession, ({ one }) => ({
  authUser: one(authUser, {
    fields: [authSession.userId],
    references: [authUser.id],
  }),
}));

export const authUserRelations = relations(authUser, ({ many }) => ({
  authSessions: many(authSession),
  authAccounts: many(authAccount),
  buyerProfiles: many(buyerProfiles),
  profileEditRequests: many(profileEditRequests),
  orderRequests_buyerId: many(orderRequests, {
    relationName: 'orderRequests_buyerId_authUser_id',
  }),
  orderRequests_confirmedByUserId: many(orderRequests, {
    relationName: 'orderRequests_confirmedByUserId_authUser_id',
  }),
  orderRequests_assignedUserId: many(orderRequests, {
    relationName: 'orderRequests_assignedUserId_authUser_id',
  }),
  authUserRoles: many(authUserRoles),
}));

export const authAccountRelations = relations(authAccount, ({ one }) => ({
  authUser: one(authUser, {
    fields: [authAccount.userId],
    references: [authUser.id],
  }),
}));

export const buyerProfilesRelations = relations(buyerProfiles, ({ one }) => ({
  authUser: one(authUser, {
    fields: [buyerProfiles.authUserId],
    references: [authUser.id],
  }),
}));

export const profileEditRequestsRelations = relations(profileEditRequests, ({ one }) => ({
  authUser: one(authUser, {
    fields: [profileEditRequests.authUserId],
    references: [authUser.id],
  }),
}));

export const categoryTranslationsRelations = relations(categoryTranslations, ({ one }) => ({
  category: one(categories, {
    fields: [categoryTranslations.categoryId],
    references: [categories.id],
  }),
  locale: one(locales, {
    fields: [categoryTranslations.locale],
    references: [locales.code],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  categoryTranslations: many(categoryTranslations),
  products: many(products),
  category: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categories_parentId_categories_id',
  }),
  categories: many(categories, {
    relationName: 'categories_parentId_categories_id',
  }),
}));

export const supplierTranslationsRelations = relations(supplierTranslations, ({ one }) => ({
  supplier: one(suppliers, {
    fields: [supplierTranslations.supplierId],
    references: [suppliers.id],
  }),
  locale: one(locales, {
    fields: [supplierTranslations.locale],
    references: [locales.code],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  supplierTranslations: many(supplierTranslations),
  products: many(products),
}));

export const productTranslationsRelations = relations(productTranslations, ({ one }) => ({
  product: one(products, {
    fields: [productTranslations.productId],
    references: [products.id],
  }),
  locale: one(locales, {
    fields: [productTranslations.locale],
    references: [locales.code],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  productTranslations: many(productTranslations),
  productAttributes: many(productAttributes),
  productImages: many(productImages),
  currency: one(currencies, {
    fields: [products.basePriceCurrency],
    references: [currencies.code],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  productOptions: many(productOptions),
  orderRequestItems: many(orderRequestItems),
  productVariants: many(productVariants),
}));

export const productAttributesRelations = relations(productAttributes, ({ one }) => ({
  product: one(products, {
    fields: [productAttributes.productId],
    references: [products.id],
  }),
  locale: one(locales, {
    fields: [productAttributes.locale],
    references: [locales.code],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const currenciesRelations = relations(currencies, ({ many }) => ({
  products: many(products),
  orderRequestItems: many(orderRequestItems),
  orderRequests_submittedCurrency: many(orderRequests, {
    relationName: 'orderRequests_submittedCurrency_currencies_code',
  }),
  orderRequests_confirmedCurrency: many(orderRequests, {
    relationName: 'orderRequests_confirmedCurrency_currencies_code',
  }),
  fxRates: many(fxRates),
  productVariants: many(productVariants),
}));

export const productOptionsRelations = relations(productOptions, ({ one, many }) => ({
  product: one(products, {
    fields: [productOptions.productId],
    references: [products.id],
  }),
  productOptionValues: many(productOptionValues),
}));

export const productOptionValuesRelations = relations(productOptionValues, ({ one, many }) => ({
  productOption: one(productOptions, {
    fields: [productOptionValues.optionId],
    references: [productOptions.id],
  }),
  productVariantOptionValues: many(productVariantOptionValues),
}));

export const orderRequestItemsRelations = relations(orderRequestItems, ({ one }) => ({
  orderRequest: one(orderRequests, {
    fields: [orderRequestItems.orderRequestId],
    references: [orderRequests.id],
  }),
  product: one(products, {
    fields: [orderRequestItems.productId],
    references: [products.id],
  }),
  currency: one(currencies, {
    fields: [orderRequestItems.currency],
    references: [currencies.code],
  }),
}));

export const orderRequestsRelations = relations(orderRequests, ({ one, many }) => ({
  orderRequestItems: many(orderRequestItems),
  authUser_buyerId: one(authUser, {
    fields: [orderRequests.buyerId],
    references: [authUser.id],
    relationName: 'orderRequests_buyerId_authUser_id',
  }),
  authUser_confirmedByUserId: one(authUser, {
    fields: [orderRequests.confirmedByUserId],
    references: [authUser.id],
    relationName: 'orderRequests_confirmedByUserId_authUser_id',
  }),
  authUser_assignedUserId: one(authUser, {
    fields: [orderRequests.assignedUserId],
    references: [authUser.id],
    relationName: 'orderRequests_assignedUserId_authUser_id',
  }),
  locale: one(locales, {
    fields: [orderRequests.locale],
    references: [locales.code],
  }),
  currency_submittedCurrency: one(currencies, {
    fields: [orderRequests.submittedCurrency],
    references: [currencies.code],
    relationName: 'orderRequests_submittedCurrency_currencies_code',
  }),
  currency_confirmedCurrency: one(currencies, {
    fields: [orderRequests.confirmedCurrency],
    references: [currencies.code],
    relationName: 'orderRequests_confirmedCurrency_currencies_code',
  }),
}));

export const fxRatesRelations = relations(fxRates, ({ one }) => ({
  currency: one(currencies, {
    fields: [fxRates.currencyCode],
    references: [currencies.code],
  }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  currency: one(currencies, {
    fields: [productVariants.basePriceCurrency],
    references: [currencies.code],
  }),
  productVariantOptionValues: many(productVariantOptionValues),
}));

export const productVariantOptionValuesRelations = relations(
  productVariantOptionValues,
  ({ one }) => ({
    productVariant: one(productVariants, {
      fields: [productVariantOptionValues.variantId],
      references: [productVariants.id],
    }),
    productOptionValue: one(productOptionValues, {
      fields: [productVariantOptionValues.optionValueId],
      references: [productOptionValues.id],
    }),
  }),
);

export const authUserRolesRelations = relations(authUserRoles, ({ one }) => ({
  authUser: one(authUser, {
    fields: [authUserRoles.authUserId],
    references: [authUser.id],
  }),
  role: one(roles, {
    fields: [authUserRoles.roleId],
    references: [roles.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  authUserRoles: many(authUserRoles),
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));
