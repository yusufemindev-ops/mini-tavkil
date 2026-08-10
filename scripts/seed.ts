import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, like } from 'drizzle-orm';
import pg from 'pg';
import * as schema from '../src/lib/db/schema';

/**
 * Seeds a small but realistic catalog so the storefront has something to render.
 *
 * Runs over DIRECT_URL (TCP) because this is a script, not a request path — real
 * transactions are allowed here. See CLAUDE.md §3.
 *
 * Idempotent: everything it writes is prefixed `seed-`, and it deletes its own rows
 * first. It never touches a row it did not create — one live database, no staging
 * (CLAUDE.md §7).
 *
 *   pnpm seed
 */

const LOCALES = ['en', 'tr', 'ar'] as const;
type Locale = (typeof LOCALES)[number];

type Tri = Record<Locale, string>;

const SUPPLIERS: { key: string; country: string; name: Tri; desc: Tri }[] = [
  {
    key: 'seed-supplier-a',
    country: 'TR',
    name: { en: 'Anatolia Chemicals', tr: 'Anadolu Kimya', ar: 'الأناضول للكيماويات' },
    desc: {
      en: 'Industrial cleaning manufacturer based in Istanbul.',
      tr: 'İstanbul merkezli endüstriyel temizlik üreticisi.',
      ar: 'مصنع منتجات التنظيف الصناعي ومقره إسطنبول.',
    },
  },
  {
    key: 'seed-supplier-b',
    country: 'TR',
    name: { en: 'Marmara Packaging', tr: 'Marmara Ambalaj', ar: 'مرمرة للتغليف' },
    desc: {
      en: 'Packaging and disposables producer serving export markets.',
      tr: 'İhracat pazarlarına hizmet veren ambalaj üreticisi.',
      ar: 'منتج مواد التغليف للأسواق التصديرية.',
    },
  },
];

const CATEGORIES: { key: string; name: Tri; desc: Tri }[] = [
  {
    key: 'seed-cleaning',
    name: { en: 'Cleaning Products', tr: 'Temizlik Ürünleri', ar: 'منتجات التنظيف' },
    desc: {
      en: 'Detergents, surface cleaners and industrial cleaning chemicals.',
      tr: 'Deterjanlar, yüzey temizleyiciler ve endüstriyel kimyasallar.',
      ar: 'منظفات ومواد تنظيف الأسطح والكيماويات الصناعية.',
    },
  },
  {
    key: 'seed-hygiene',
    name: { en: 'Paper & Hygiene', tr: 'Kağıt ve Hijyen', ar: 'الورق والنظافة' },
    desc: {
      en: 'Tissue, towels and washroom hygiene supplies.',
      tr: 'Peçete, havlu ve tuvalet hijyen ürünleri.',
      ar: 'مناديل ومناشف ومستلزمات النظافة.',
    },
  },
  {
    key: 'seed-packaging',
    name: { en: 'Packaging', tr: 'Ambalaj', ar: 'التغليف' },
    desc: {
      en: 'Bags, films and disposable food packaging.',
      tr: 'Poşetler, filmler ve gıda ambalajları.',
      ar: 'أكياس وأغلفة وعبوات غذائية.',
    },
  },
];

const PRODUCTS: {
  key: string;
  category: string;
  supplier: string;
  unit: string;
  moq: number;
  price: string;
  featured?: boolean;
  name: Tri;
  desc: Tri;
}[] = [
  // Cleaning
  {
    key: 'seed-p-01',
    category: 'seed-cleaning',
    supplier: 'seed-supplier-a',
    unit: 'L',
    moq: 12,
    price: '4.20',
    featured: true,
    name: {
      en: 'Multi-Surface Cleaner 5L',
      tr: 'Çok Amaçlı Temizleyici 5L',
      ar: 'منظف متعدد الأسطح 5 لتر',
    },
    desc: {
      en: 'Concentrated cleaner for floors, tiles and hard surfaces.',
      tr: 'Zemin, fayans ve sert yüzeyler için konsantre temizleyici.',
      ar: 'منظف مركّز للأرضيات والبلاط والأسطح الصلبة.',
    },
  },
  {
    key: 'seed-p-02',
    category: 'seed-cleaning',
    supplier: 'seed-supplier-a',
    unit: 'L',
    moq: 12,
    price: '5.80',
    name: {
      en: 'Industrial Degreaser 5L',
      tr: 'Endüstriyel Yağ Çözücü 5L',
      ar: 'مزيل الشحوم الصناعي 5 لتر',
    },
    desc: {
      en: 'Heavy-duty degreaser for kitchens and workshops.',
      tr: 'Mutfak ve atölyeler için güçlü yağ çözücü.',
      ar: 'مزيل شحوم قوي للمطابخ والورش.',
    },
  },
  {
    key: 'seed-p-03',
    category: 'seed-cleaning',
    supplier: 'seed-supplier-a',
    unit: 'L',
    moq: 24,
    price: '3.10',
    featured: true,
    name: { en: 'Glass Cleaner 1L', tr: 'Cam Temizleyici 1L', ar: 'منظف زجاج 1 لتر' },
    desc: {
      en: 'Streak-free glass and mirror cleaner.',
      tr: 'İz bırakmayan cam ve ayna temizleyici.',
      ar: 'منظف زجاج ومرايا بدون خطوط.',
    },
  },
  {
    key: 'seed-p-04',
    category: 'seed-cleaning',
    supplier: 'seed-supplier-a',
    unit: 'kg',
    moq: 20,
    price: '2.45',
    name: { en: 'Laundry Powder 10kg', tr: 'Toz Çamaşır Deterjanı 10kg', ar: 'مسحوق غسيل 10 كجم' },
    desc: {
      en: 'High-efficiency powder for commercial laundry.',
      tr: 'Ticari çamaşırhaneler için yüksek verimli toz.',
      ar: 'مسحوق عالي الكفاءة للمغاسل التجارية.',
    },
  },
  {
    key: 'seed-p-05',
    category: 'seed-cleaning',
    supplier: 'seed-supplier-a',
    unit: 'L',
    moq: 12,
    price: '6.90',
    name: {
      en: 'Disinfectant Concentrate 5L',
      tr: 'Dezenfektan Konsantre 5L',
      ar: 'مطهر مركّز 5 لتر',
    },
    desc: {
      en: 'Broad-spectrum disinfectant for food-safe environments.',
      tr: 'Gıda güvenli ortamlar için geniş spektrumlu dezenfektan.',
      ar: 'مطهر واسع الطيف للبيئات الغذائية الآمنة.',
    },
  },

  // Paper & hygiene
  {
    key: 'seed-p-06',
    category: 'seed-hygiene',
    supplier: 'seed-supplier-b',
    unit: 'box',
    moq: 10,
    price: '18.50',
    featured: true,
    name: {
      en: 'Centre-Feed Paper Roll (6 pack)',
      tr: 'İçten Çekmeli Kağıt Havlu (6’lı)',
      ar: 'لفة ورق سحب مركزي (6 حبات)',
    },
    desc: {
      en: 'Two-ply absorbent rolls for industrial washrooms.',
      tr: 'Endüstriyel tuvaletler için çift katlı emici rulolar.',
      ar: 'لفات ماصة بطبقتين للحمامات الصناعية.',
    },
  },
  {
    key: 'seed-p-07',
    category: 'seed-hygiene',
    supplier: 'seed-supplier-b',
    unit: 'box',
    moq: 10,
    price: '12.40',
    name: {
      en: 'Z-Fold Hand Towels (200 sheets)',
      tr: 'Z Katlama Kağıt Havlu (200 yaprak)',
      ar: 'مناشف يد مطوية Z (200 ورقة)',
    },
    desc: {
      en: 'Interfold hand towels compatible with standard dispensers.',
      tr: 'Standart dispenserlerle uyumlu katlı kağıt havlu.',
      ar: 'مناشف يد متوافقة مع الموزعات القياسية.',
    },
  },
  {
    key: 'seed-p-08',
    category: 'seed-hygiene',
    supplier: 'seed-supplier-b',
    unit: 'box',
    moq: 20,
    price: '9.75',
    name: {
      en: 'Jumbo Toilet Roll (12 pack)',
      tr: 'Jumbo Tuvalet Kağıdı (12’li)',
      ar: 'لفة تواليت جامبو (12 حبة)',
    },
    desc: {
      en: 'High-capacity rolls for high-traffic facilities.',
      tr: 'Yoğun kullanımlı tesisler için yüksek kapasiteli rulolar.',
      ar: 'لفات عالية السعة للمنشآت كثيفة الاستخدام.',
    },
  },
  {
    key: 'seed-p-09',
    category: 'seed-hygiene',
    supplier: 'seed-supplier-b',
    unit: 'pcs',
    moq: 50,
    price: '1.85',
    name: { en: 'Foam Soap Dispenser', tr: 'Köpük Sabun Dispenseri', ar: 'موزع صابون رغوي' },
    desc: {
      en: 'Wall-mounted manual dispenser, 1L capacity.',
      tr: 'Duvara monte manuel dispenser, 1L kapasite.',
      ar: 'موزع يدوي جداري بسعة 1 لتر.',
    },
  },

  // Packaging
  {
    key: 'seed-p-10',
    category: 'seed-packaging',
    supplier: 'seed-supplier-b',
    unit: 'box',
    moq: 25,
    price: '7.30',
    featured: true,
    name: {
      en: 'Vacuum Pouches 20×30cm (1000 pcs)',
      tr: 'Vakum Poşeti 20×30cm (1000 adet)',
      ar: 'أكياس تفريغ 20×30 سم (1000 حبة)',
    },
    desc: {
      en: 'Food-grade vacuum pouches for cold-chain packing.',
      tr: 'Soğuk zincir paketleme için gıda sınıfı vakum poşetleri.',
      ar: 'أكياس تفريغ غذائية لتعبئة سلسلة التبريد.',
    },
  },
  {
    key: 'seed-p-11',
    category: 'seed-packaging',
    supplier: 'seed-supplier-b',
    unit: 'roll',
    moq: 15,
    price: '14.60',
    name: { en: 'Stretch Film 500mm', tr: 'Streç Film 500mm', ar: 'فيلم تغليف مطاطي 500 مم' },
    desc: {
      en: 'Pallet wrap, 23 micron, 1.5kg net.',
      tr: 'Palet sarma filmi, 23 mikron, 1.5kg net.',
      ar: 'غلاف منصات، 23 ميكرون، 1.5 كجم صافي.',
    },
  },
  {
    key: 'seed-p-12',
    category: 'seed-packaging',
    supplier: 'seed-supplier-b',
    unit: 'box',
    moq: 30,
    price: '5.95',
    name: {
      en: 'Kraft Food Boxes (500 pcs)',
      tr: 'Kraft Gıda Kutusu (500 adet)',
      ar: 'علب طعام كرافت (500 حبة)',
    },
    desc: {
      en: 'Compostable kraft containers for takeaway service.',
      tr: 'Paket servis için kompostlanabilir kraft kaplar.',
      ar: 'علب كرافت قابلة للتحلل لخدمة الطلبات الخارجية.',
    },
  },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '');

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
    suppliers,
    supplierTranslations,
  } = schema;

  // ── Clean up previous seed rows only. Never a broad delete (CLAUDE.md §7). ──
  // Dedupe: each entity has one translation row per locale, so the join returns it 3×.
  const uniq = (rows: { id: string }[]) => [...new Set(rows.map((r) => r.id))];

  const oldProducts = uniq(
    await db
      .select({ id: products.id })
      .from(products)
      .innerJoin(productTranslations, eq(productTranslations.productId, products.id))
      .where(like(productTranslations.slug, 'seed-%')),
  );
  for (const id of oldProducts) {
    await db.delete(productImages).where(eq(productImages.productId, id));
    await db.delete(productTranslations).where(eq(productTranslations.productId, id));
    await db.delete(products).where(eq(products.id, id));
  }
  const oldCats = uniq(
    await db
      .select({ id: categoryTranslations.categoryId })
      .from(categoryTranslations)
      .where(like(categoryTranslations.slug, 'seed-%')),
  );
  for (const id of oldCats) {
    await db.delete(categoryTranslations).where(eq(categoryTranslations.categoryId, id));
    await db.delete(categories).where(eq(categories.id, id));
  }
  const oldSups = uniq(
    await db
      .select({ id: supplierTranslations.supplierId })
      .from(supplierTranslations)
      .where(like(supplierTranslations.slug, 'seed-%')),
  );
  for (const id of oldSups) {
    await db.delete(supplierTranslations).where(eq(supplierTranslations.supplierId, id));
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }
  console.log(
    `cleared previous seed: ${oldProducts.length} products, ${oldCats.length} categories, ${oldSups.length} suppliers`,
  );

  // ── Suppliers (admin-only — never rendered on the storefront) ──
  const supplierIds = new Map<string, string>();
  for (const s of SUPPLIERS) {
    const [row] = await db
      .insert(suppliers)
      .values({ countryCode: s.country, status: 'published', isVerified: true })
      .returning({ id: suppliers.id });
    supplierIds.set(s.key, row.id);
    await db.insert(supplierTranslations).values(
      LOCALES.map((l) => ({
        supplierId: row.id,
        locale: l,
        name: s.name[l],
        description: s.desc[l],
        slug: `${s.key}-${l}`,
        isComplete: true,
      })),
    );
  }

  // ── Categories ──
  const categoryIds = new Map<string, string>();
  let order = 1;
  for (const c of CATEGORIES) {
    const [row] = await db
      .insert(categories)
      .values({ status: 'published', displayOrder: order++ })
      .returning({ id: categories.id });
    categoryIds.set(c.key, row.id);
    await db.insert(categoryTranslations).values(
      LOCALES.map((l) => ({
        categoryId: row.id,
        locale: l,
        name: c.name[l],
        description: c.desc[l],
        slug: `${c.key}-${slugify(c.name[l])}`,
        seoTitle: c.name[l],
        seoDescription: c.desc[l],
        isComplete: true,
      })),
    );
  }

  // ── Products ──
  let sort = 1;
  for (const p of PRODUCTS) {
    const [row] = await db
      .insert(products)
      .values({
        categoryId: categoryIds.get(p.category)!,
        supplierId: supplierIds.get(p.supplier)!,
        sku: p.key.toUpperCase(),
        unit: p.unit,
        moq: p.moq,
        // Admin-only. Must never reach a public response — see public-data-guard.
        basePriceAmount: p.price,
        basePriceCurrency: 'USD',
        countryOfOrigin: 'TR',
        status: 'published',
        sortOrder: sort++,
        isFeatured: p.featured ?? false,
      })
      .returning({ id: products.id });

    await db.insert(productTranslations).values(
      LOCALES.map((l) => ({
        productId: row.id,
        locale: l,
        name: p.name[l],
        description: p.desc[l],
        slug: `${p.key}-${slugify(p.name[l])}`,
        seoTitle: p.name[l],
        seoDescription: p.desc[l],
        isComplete: true,
      })),
    );

    // Placeholder images until the R2 upload pipeline lands.
    await db.insert(productImages).values([
      {
        productId: row.id,
        url: `https://placehold.co/1200x1200/e2e8f0/475569.webp?text=${encodeURIComponent(p.name.en)}`,
        altTranslations: Object.fromEntries(LOCALES.map((l) => [l, p.name[l]])),
        isPrimary: true,
        sortOrder: 1,
      },
    ]);
  }

  const counts = {
    suppliers: SUPPLIERS.length,
    categories: CATEGORIES.length,
    products: PRODUCTS.length,
    translations: (SUPPLIERS.length + CATEGORIES.length + PRODUCTS.length) * LOCALES.length,
  };
  console.log(`seeded: ${JSON.stringify(counts)}`);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
