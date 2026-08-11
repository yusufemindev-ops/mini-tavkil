import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, like } from 'drizzle-orm';
import pg from 'pg';
import * as schema from '../../src/lib/db/schema';
import { CATEGORIES, PRODUCTS, type Locale, type Tri } from './catalogue';

/**
 * Imports Temsan's real catalogue: 82 products, 104 variants, 243 photographs.
 *
 * Temsan is the first supplier, and this is their own data — the 15.03.2026 price
 * list, the categorised product list, and the studio photography. `data.json`
 * holds everything measured (price, barcode, carton quantity, CBM, weight, which
 * photo is the packshot); `catalogue.ts` holds everything written. They join on
 * product code.
 *
 * Runs over DIRECT_URL (TCP), so real transactions are available — this is a
 * script, not a request path (CLAUDE.md §3).
 *
 * Idempotent. Every row it writes has a `temsan-` slug and it clears those first,
 * so re-running after a price change is safe. It also clears the `seed-` demo
 * catalogue this replaces. It never touches a row it did not create — one live
 * database, no staging (CLAUDE.md §7).
 *
 *   pnpm import:temsan
 */

const LOCALES = ['en', 'tr', 'ar'] as const;

const here = dirname(fileURLToPath(import.meta.url));

interface VariantData {
  code: string;
  trName: string;
  tryPrice: number | null;
  barcode: string | null;
  boxQuantity: number | null;
  unit: string | null;
  cbm: number | null;
  weightKg: number | null;
  measure: string | null;
  measureUnit: string | null;
  images: { key: string; file: string; isPrimary: boolean; sortOrder: number }[];
}

interface ProductData {
  kind: 'family' | 'single';
  mainTr: string;
  subTr: string;
  baseNameTr: string;
  optionUnit: string | null;
  variants: VariantData[];
}

const DATA: ProductData[] = JSON.parse(readFileSync(join(here, 'data.json'), 'utf8'));

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '');

/** `PK` and `AD` are the supplier's units; the catalogue speaks in pieces and packs. */
const UNIT: Record<string, string> = { AD: 'piece', PK: 'pack', KG: 'kg', MT: 'm' };

/** "40" + "CM" reads as "40 cm"; measurements are formatted, never translated. */
function measureLabel(v: VariantData): string {
  const unit = (v.measureUnit ?? '').toLowerCase();
  return `${(v.measure ?? '').replace('x', '×')} ${unit === 'mt' ? 'm' : unit}`.trim();
}

async function main() {
  const url = process.env.DIRECT_URL;
  if (!url) throw new Error('DIRECT_URL is not set');

  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool, { schema, casing: 'snake_case' });
  const {
    categories,
    categoryTranslations,
    products,
    productTranslations,
    productImages,
    productOptions,
    productOptionValues,
    productVariants,
    productVariantOptionValues,
    suppliers,
    supplierTranslations,
    fxRates,
  } = schema;

  // ── Price basis ────────────────────────────────────────────────────────────
  // The list is in Turkish lira; the catalogue stores USD. The rate is whatever
  // the FX cron last fetched, so the stored figure tracks the real one — and
  // because no price is ever public, a stale rate is an internal inconvenience
  // rather than a wrong number shown to a buyer.
  const [tryRate] = await db.select().from(fxRates).where(eq(fxRates.currencyCode, 'TRY')).limit(1);
  const rate = Number(tryRate?.rateToUsd ?? 0);
  if (!rate) throw new Error('No TRY rate in fx_rates — run `pnpm fx:refresh` first.');
  const toUsd = (lira: number | null) =>
    lira == null ? null : (Math.round((lira / rate) * 10000) / 10000).toFixed(4);
  console.log(`TRY→USD at ${rate} (${tryRate.source}, fetched ${tryRate.fetchedAt})`);

  // ── Clear what this script owns, and the demo catalogue it replaces ─────────
  const uniq = (rows: { id: string }[]) => [...new Set(rows.map((r) => r.id))];

  let clearedProducts = 0;
  let clearedCategories = 0;
  let clearedSuppliers = 0;
  for (const prefix of ['seed-%', 'temsan-%']) {
    const oldProducts = uniq(
      await db
        .select({ id: products.id })
        .from(products)
        .innerJoin(productTranslations, eq(productTranslations.productId, products.id))
        .where(like(productTranslations.slug, prefix)),
    );
    for (const id of oldProducts) {
      // Options cascade to values and to variant links; variants are removed
      // explicitly because they hang off the product, not the option.
      await db.delete(productVariants).where(eq(productVariants.productId, id));
      await db.delete(productOptions).where(eq(productOptions.productId, id));
      await db.delete(productImages).where(eq(productImages.productId, id));
      await db.delete(productTranslations).where(eq(productTranslations.productId, id));
      await db.delete(products).where(eq(products.id, id));
    }
    clearedProducts += oldProducts.length;

    // Children before parents, or the parent delete trips the self-reference.
    const oldCats = uniq(
      await db
        .select({ id: categoryTranslations.categoryId })
        .from(categoryTranslations)
        .where(like(categoryTranslations.slug, prefix)),
    );
    const rows = oldCats.length
      ? await db.select({ id: categories.id, parentId: categories.parentId }).from(categories)
      : [];
    const ordered = [
      ...oldCats.filter((id) => rows.find((r) => r.id === id)?.parentId),
      ...oldCats.filter((id) => !rows.find((r) => r.id === id)?.parentId),
    ];
    for (const id of ordered) {
      await db.delete(categoryTranslations).where(eq(categoryTranslations.categoryId, id));
      await db.delete(categories).where(eq(categories.id, id));
    }
    clearedCategories += oldCats.length;

    const oldSups = uniq(
      await db
        .select({ id: supplierTranslations.supplierId })
        .from(supplierTranslations)
        .where(like(supplierTranslations.slug, prefix)),
    );
    for (const id of oldSups) {
      await db.delete(supplierTranslations).where(eq(supplierTranslations.supplierId, id));
      await db.delete(suppliers).where(eq(suppliers.id, id));
    }
    clearedSuppliers += oldSups.length;
  }
  console.log(
    `cleared ${clearedProducts} products, ${clearedCategories} categories, ${clearedSuppliers} suppliers`,
  );

  // ── Supplier ───────────────────────────────────────────────────────────────
  // Admin-only, like every supplier: the name must never reach a public response
  // (CLAUDE.md §1). Address and contacts come from the price list letterhead.
  const supplierName: Tri = {
    en: 'Temsan Global',
    tr: 'Temsan Global',
    ar: 'تمسان جلوبال',
  };
  const [supplier] = await db
    .insert(suppliers)
    .values({
      countryCode: 'TR',
      status: 'published',
      isVerified: true,
      website: 'https://www.temsanis.com',
      contactEmailInternal: 'temsan@temsanis.com',
      contactPhoneInternal: '+90 535 976 90 80',
      address: 'Mahmutbey Mah. Ordu Cad. 2581. Sok. No: 3/A, Bağcılar, İstanbul, Türkiye',
      internalNotes:
        'Price list of 15.03.2026. ISO 9001, 14001, 45001 and 10002 certified. ' +
        'Brands: Temsan, Tesa, Evima, Viomax. Factories in İkitelli (İstanbul) and Ağlı (Kastamonu).',
    })
    .returning({ id: suppliers.id });

  await db.insert(supplierTranslations).values(
    LOCALES.map((l) => ({
      supplierId: supplier.id,
      locale: l,
      name: supplierName[l],
      slug: `temsan-global-${l}`,
      description: null,
      isComplete: true,
    })),
  );

  // ── Categories ─────────────────────────────────────────────────────────────
  const categoryIdByKey = new Map<string, string>();
  const categoryIdByTr = new Map<string, string>();
  let displayOrder = 1;
  const rootsFirst = [...CATEGORIES].sort((a, b) => Number(!!a.parent) - Number(!!b.parent));
  for (const c of rootsFirst) {
    const [row] = await db
      .insert(categories)
      .values({
        parentId: c.parent ? categoryIdByKey.get(c.parent) : null,
        status: 'published',
        displayOrder: displayOrder++,
        // Filled in below, once the products that belong here exist: a
        // sub-category card shows one of its own products. Leaving it null is
        // what made the catalogue page a wall of blank gradient placeholders.
        imageUrl: null,
      })
      .returning({ id: categories.id });
    categoryIdByKey.set(c.key, row.id);
    categoryIdByTr.set(c.trSource, row.id);

    await db.insert(categoryTranslations).values(
      LOCALES.map((l) => ({
        categoryId: row.id,
        locale: l,
        name: c.name[l],
        description: c.desc[l],
        slug: `temsan-${slugify(c.name[l])}`,
        seoTitle: c.name[l],
        seoDescription: c.desc[l],
        isComplete: true,
      })),
    );
  }
  console.log(`inserted ${CATEGORIES.length} categories`);

  // ── Products ───────────────────────────────────────────────────────────────
  const authored = new Map(PRODUCTS.map((p) => [p.code, p]));
  let sortOrder = 1;
  let variantCount = 0;
  let imageCount = 0;

  for (const data of DATA) {
    const copy = authored.get(data.variants[0].code);
    if (!copy) throw new Error(`No copy authored for ${data.variants[0].code}`);

    const categoryId = categoryIdByTr.get(data.subTr);
    if (!categoryId) throw new Error(`No category for ${data.subTr}`);

    // The family's headline figures come from its first variant — the smallest
    // size, which is the one a buyer sees quoted.
    const lead = data.variants[0];
    const [row] = await db
      .insert(products)
      .values({
        categoryId,
        supplierId: supplier.id,
        sku: lead.code,
        gtin13: lead.barcode,
        unit: UNIT[lead.unit ?? ''] ?? 'piece',
        moq: 1,
        boxQuantity: lead.boxQuantity,
        weightKg: lead.weightKg == null ? null : String(lead.weightKg),
        cbm: lead.cbm == null ? null : String(lead.cbm),
        basePriceAmount: toUsd(lead.tryPrice),
        basePriceCurrency: 'USD',
        countryOfOrigin: 'TR',
        brandName: 'Temsan',
        status: 'published',
        sortOrder: sortOrder++,
      })
      .returning({ id: products.id });

    await db.insert(productTranslations).values(
      LOCALES.map((l) => ({
        productId: row.id,
        locale: l,
        name: copy.name[l],
        description: copy.desc[l],
        slug: `temsan-${slugify(copy.name[l])}`,
        seoTitle: copy.name[l],
        seoDescription: copy.desc[l],
        isComplete: true,
      })),
    );

    // Images: the whole family's photographs, the lead variant's packshot first.
    const imageRows = data.variants.flatMap((v, variantIndex) =>
      v.images.map((img) => ({
        productId: row.id,
        url: img.key,
        altTranslations: Object.fromEntries(LOCALES.map((l) => [l, copy.name[l]])) as Record<
          Locale,
          string
        >,
        isPrimary: variantIndex === 0 && img.isPrimary,
        sortOrder: variantIndex * 100 + img.sortOrder,
      })),
    );
    await db.insert(productImages).values(imageRows);
    imageCount += imageRows.length;

    // ── Variants ─────────────────────────────────────────────────────────────
    // Only families get an option axis. A single-row product has nothing to
    // choose between, and an option with one value is noise on the page.
    if (data.kind !== 'family' || !copy.option) continue;

    const [option] = await db
      .insert(productOptions)
      .values({ productId: row.id, name: copy.option.en, type: 'chip', sortOrder: 0 })
      .returning({ id: productOptions.id });

    for (const [index, v] of data.variants.entries()) {
      const [value] = await db
        .insert(productOptionValues)
        .values({ optionId: option.id, label: measureLabel(v), sortOrder: index })
        .returning({ id: productOptionValues.id });

      const [variant] = await db
        .insert(productVariants)
        .values({
          productId: row.id,
          sku: v.code,
          basePriceAmount: toUsd(v.tryPrice),
          basePriceCurrency: 'USD',
          moq: 1,
          packSize: v.boxQuantity,
          weightKg: v.weightKg == null ? null : String(v.weightKg),
          imageUrl: v.images.find((i) => i.isPrimary)?.key ?? null,
          isDefault: index === 0,
          isActive: true,
          sortOrder: index,
        })
        .returning({ id: productVariants.id });

      await db
        .insert(productVariantOptionValues)
        .values({ variantId: variant.id, optionValueId: value.id });
      variantCount += 1;
    }
  }

  console.log(
    `imported ${DATA.length} products, ${variantCount} variants, ${imageCount} images ` +
      `(${DATA.filter((d) => d.kind === 'family').length} families)`,
  );

  // ── Category images ────────────────────────────────────────────────────────
  // A sub-category shows the packshot of its first product; a root shows the
  // first image of its first child. Every card on the catalogue page then has a
  // real photograph instead of a placeholder, and it is always a picture of
  // something actually inside.
  let pictured = 0;
  for (const c of CATEGORIES.filter((x) => x.parent)) {
    const first = DATA.find((d) => d.subTr === c.trSource);
    const key = first?.variants[0].images.find((i) => i.isPrimary)?.key;
    if (!key) continue;
    await db
      .update(categories)
      .set({ imageUrl: key })
      .where(eq(categories.id, categoryIdByKey.get(c.key)!));
    pictured += 1;
  }
  for (const root of CATEGORIES.filter((x) => !x.parent)) {
    const child = CATEGORIES.find((x) => x.parent === root.key);
    const first = child && DATA.find((d) => d.subTr === child.trSource);
    const key = first?.variants[0].images.find((i) => i.isPrimary)?.key;
    if (!key) continue;
    await db
      .update(categories)
      .set({ imageUrl: key })
      .where(eq(categories.id, categoryIdByKey.get(root.key)!));
    pictured += 1;
  }
  console.log(`gave ${pictured} categories a photograph from their own products`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
