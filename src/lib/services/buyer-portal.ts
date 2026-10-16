import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { notFound } from '@/lib/api/errors';
import {
  type BuyerProfilePublic,
  type BuyerSessionContext,
  toBuyerProfilePublic,
} from '@/lib/buyer-guard';
import { db } from '@/lib/db';
import {
  auditLog,
  authUser,
  buyerProfiles,
  currencies,
  fxRates,
  productImages,
  productOptions,
  productOptionValues,
  products,
  productTranslations,
  productVariantOptionValues,
  productVariants,
} from '@/lib/db/schema';
import { resolveImageUrl } from '@/lib/media/image-url';
import type { UpdateBuyerProfileInput } from '@/lib/services/buyers-schema';
import { BASE_CURRENCY } from '@/lib/services/currencies';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PublicCurrencyItem {
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  rateToUsd: number;
}

export interface BuyerVariantPricing {
  id: string;
  sku: string | null;
  moq: number;
  packSize: number | null;
  isDefault: boolean;
  unitPrice: number | null;
  currency: string;
  options: Record<string, string>;
}

export interface BuyerProductPricing {
  productId: string;
  sku: string | null;
  moq: number;
  unit: string;
  packSize: number | null;
  boxQuantity: number | null;
  unitPrice: number | null;
  currency: string;
  pendingVerification: boolean;
  imageUrl: string | null;
  variants: BuyerVariantPricing[];
}

export const publicContactSchema = z.object({
  name: z.string().trim().min(1).max(160),
  company: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(5).max(4000),
  turnstileToken: z.string().optional(),
});

export type PublicContactInput = z.infer<typeof publicContactSchema>;

export async function listPublicCurrencies(): Promise<PublicCurrencyItem[]> {
  const rows = await db
    .select({
      code: currencies.code,
      name: currencies.name,
      symbol: currencies.symbol,
      rateToUsd: fxRates.rateToUsd,
    })
    .from(currencies)
    .leftJoin(fxRates, eq(fxRates.currencyCode, currencies.code))
    .where(eq(currencies.isActive, true))
    .orderBy(asc(currencies.sortOrder));

  return rows.map((row) => ({
    code: row.code.trim(),
    name: row.name,
    symbol: row.symbol,
    isBase: row.code.trim() === BASE_CURRENCY,
    rateToUsd:
      row.code.trim() === BASE_CURRENCY
        ? 1
        : row.rateToUsd !== null && Number(row.rateToUsd) > 0
          ? Number(row.rateToUsd)
          : 1,
  }));
}

export async function updateBuyerProfile(
  buyerId: string,
  input: UpdateBuyerProfileInput,
): Promise<BuyerProfilePublic> {
  const [existing] = await db
    .select({
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      firstName: authUser.firstName,
      lastName: authUser.lastName,
      contactName: authUser.contactName,
      companyName: authUser.companyName,
      jobTitle: authUser.jobTitle,
      phone: authUser.phone,
      country: authUser.country,
      city: authUser.city,
      address: authUser.address,
      preferredLocale: authUser.preferredLocale,
      verified: authUser.verified,
      createdAt: authUser.createdAt,
      tierMarkupPercent: buyerProfiles.tierMarkupPercent,
    })
    .from(authUser)
    .innerJoin(buyerProfiles, eq(buyerProfiles.authUserId, authUser.id))
    .where(and(eq(authUser.id, buyerId), eq(authUser.userType, 'buyer')))
    .limit(1);

  if (!existing) throw notFound('Buyer profile not found.');

  const nowIso = new Date().toISOString();
  const nextFirstName = input.firstName.trim();
  const nextLastName = input.lastName.trim();
  const nextContactName =
    [nextFirstName, nextLastName].filter(Boolean).join(' ').trim() ||
    existing.contactName ||
    existing.name;
  const nextCompany =
    input.company !== undefined ? input.company?.trim() || null : existing.companyName;
  const nextJobTitle =
    input.jobTitle !== undefined ? input.jobTitle?.trim() || null : existing.jobTitle;
  const nextPhone = input.phone !== undefined ? input.phone?.trim() || null : existing.phone;
  const nextCountry = input.country.trim().toUpperCase();
  const nextCity = input.city !== undefined ? input.city?.trim() || null : existing.city;
  const nextAddress =
    input.address !== undefined ? input.address?.trim() || null : existing.address;
  const nextLocale = input.preferredLocale ?? existing.preferredLocale ?? 'en';

  await db.batch([
    db
      .update(authUser)
      .set({
        name: nextContactName,
        contactName: nextContactName,
        firstName: nextFirstName,
        lastName: nextLastName,
        companyName: nextCompany,
        jobTitle: nextJobTitle,
        phone: nextPhone,
        country: nextCountry,
        city: nextCity,
        address: nextAddress,
        preferredLocale: nextLocale,
        updatedAt: nowIso,
      })
      .where(eq(authUser.id, buyerId)),
    db.insert(auditLog).values({
      actorType: 'buyer',
      actorId: buyerId,
      authMethod: 'session',
      action: 'buyer.profile.update',
      resourceType: 'buyer',
      resourceId: buyerId,
      afterState: input,
    }),
  ]);

  return toBuyerProfilePublic({
    id: existing.id,
    email: existing.email,
    companyName: nextCompany ?? '',
    contactName: nextContactName,
    firstName: nextFirstName,
    lastName: nextLastName,
    preferredLocale: nextLocale,
    phone: nextPhone ?? null,
    jobTitle: nextJobTitle ?? null,
    country: nextCountry,
    city: nextCity ?? null,
    address: nextAddress ?? null,
    memberSince: existing.createdAt,
    verified: Boolean(existing.verified),
  });
}

/**
 * Returns personalized buyer pricing for a published product by slug or UUID.
 * Raw `basePriceAmount`, `tierMarkupPercent`, and `supplierId` are never included in the return shape.
 */
export async function getBuyerProductPricing(
  slugOrId: string,
  buyer: BuyerSessionContext,
): Promise<BuyerProductPricing> {
  const normalized = slugOrId.trim();
  let productId: string | null = null;

  if (UUID_RE.test(normalized)) {
    productId = normalized;
  } else {
    const [trans] = await db
      .select({ productId: productTranslations.productId })
      .from(productTranslations)
      .where(eq(productTranslations.slug, normalized))
      .limit(1);
    productId = trans?.productId ?? null;
  }

  if (!productId) throw notFound('Product not found.');

  const [[product], [buyerProfile]] = await Promise.all([
    db
      .select({
        id: products.id,
        sku: products.sku,
        moq: products.moq,
        unit: products.unit,
        packSize: products.packSize,
        boxQuantity: products.boxQuantity,
        basePriceAmount: products.basePriceAmount,
        basePriceCurrency: products.basePriceCurrency,
      })
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.status, 'published'),
          isNull(products.deletedAt),
        ),
      )
      .limit(1),
    db
      .select({ tierMarkupPercent: buyerProfiles.tierMarkupPercent })
      .from(buyerProfiles)
      .where(eq(buyerProfiles.authUserId, buyer.id))
      .limit(1),
  ]);

  if (!product) throw notFound('Product not found.');
  const tierMarkup =
    buyerProfile?.tierMarkupPercent !== null && buyerProfile?.tierMarkupPercent !== undefined
      ? Number(buyerProfile.tierMarkupPercent)
      : 0;

  const [primaryImg] = await db
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.productId, product.id))
    .orderBy(asc(productImages.sortOrder))
    .limit(1);

  const variantRows = await db
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      moq: productVariants.moq,
      packSize: productVariants.packSize,
      isDefault: productVariants.isDefault,
      basePriceAmount: productVariants.basePriceAmount,
      basePriceCurrency: productVariants.basePriceCurrency,
    })
    .from(productVariants)
    .where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true)))
    .orderBy(asc(productVariants.sortOrder));

  const variantOptionsMap = new Map<string, Record<string, string>>();
  if (variantRows.length > 0) {
    const variantIds = variantRows.map((v) => v.id);
    const optionMappings = await db
      .select({
        variantId: productVariantOptionValues.variantId,
        optionName: productOptions.name,
        valueLabel: productOptionValues.label,
      })
      .from(productVariantOptionValues)
      .innerJoin(
        productOptionValues,
        eq(productOptionValues.id, productVariantOptionValues.optionValueId),
      )
      .innerJoin(productOptions, eq(productOptions.id, productOptionValues.optionId))
      .where(inArray(productVariantOptionValues.variantId, variantIds));

    for (const row of optionMappings) {
      const map = variantOptionsMap.get(row.variantId) ?? {};
      map[row.optionName] = row.valueLabel;
      variantOptionsMap.set(row.variantId, map);
    }
  }

  const markupMultiplier = 1 + tierMarkup / 100;
  const basePriceNum =
    product.basePriceAmount !== null && Number(product.basePriceAmount) > 0
      ? Number(product.basePriceAmount)
      : null;

  const computedProductUnitPrice =
    buyer.verified && basePriceNum !== null ? round2(basePriceNum * markupMultiplier) : null;
  const productCurrency = (product.basePriceCurrency ?? BASE_CURRENCY).trim();

  const variants: BuyerVariantPricing[] = variantRows.map((v) => {
    const vBase =
      v.basePriceAmount !== null && Number(v.basePriceAmount) > 0
        ? Number(v.basePriceAmount)
        : basePriceNum;
    const vUnitPrice = buyer.verified && vBase !== null ? round2(vBase * markupMultiplier) : null;

    return {
      id: v.id,
      sku: v.sku,
      moq: v.moq,
      packSize: v.packSize,
      isDefault: v.isDefault,
      unitPrice: vUnitPrice,
      currency: (v.basePriceCurrency ?? productCurrency).trim(),
      options: variantOptionsMap.get(v.id) ?? {},
    };
  });

  return {
    productId: product.id,
    sku: product.sku,
    moq: product.moq,
    unit: product.unit,
    packSize: product.packSize,
    boxQuantity: product.boxQuantity,
    unitPrice: computedProductUnitPrice,
    currency: productCurrency,
    pendingVerification: !buyer.verified,
    imageUrl: primaryImg?.url ? resolveImageUrl(primaryImg.url) : null,
    variants,
  };
}
