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

const CATEGORIES: { key: string; parent?: string; name: Tri; desc: Tri }[] = [
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
  // ─── Subcategories ─────────────────────────────────────────────────────────
  // Tavkil's catalogue is three levels: category → subcategory → product, and the
  // storefront already renders that (`children.length > 0` swaps product cards for
  // SubcategoryTile). It looked two-level here only because the seed created no
  // children — a data gap, not a missing feature.
  {
    key: 'seed-mops',
    parent: 'seed-cleaning',
    name: { en: 'Mops & Floor Care', tr: 'Mop ve Zemin Bakımı', ar: 'الممساح والعناية بالأرضيات' },
    desc: {
      en: 'Mop heads, frames and refills for wet and dry floor cleaning.',
      tr: 'Islak ve kuru zemin temizliği için mop başlıkları, iskeletler ve yedekler.',
      ar: 'رؤوس ممساح وهياكل وبدائل لتنظيف الأرضيات الرطب والجاف.',
    },
  },
  {
    key: 'seed-cloths',
    parent: 'seed-cleaning',
    name: { en: 'Cloths & Wipes', tr: 'Bez ve Mendiller', ar: 'المناشف والمماسح' },
    desc: {
      en: 'Microfibre and cotton cloths for surfaces, glass and polishing.',
      tr: 'Yüzey, cam ve parlatma için mikrofiber ve pamuklu bezler.',
      ar: 'مناشف ميكروفايبر وقطن للأسطح والزجاج والتلميع.',
    },
  },
  {
    key: 'seed-sponges',
    parent: 'seed-cleaning',
    name: { en: 'Sponges & Scourers', tr: 'Sünger ve Ovma Telleri', ar: 'الإسفنج وأدوات الجلي' },
    desc: {
      en: 'Kitchen sponges, scourers and abrasive pads.',
      tr: 'Mutfak süngerleri, ovma telleri ve aşındırıcı pedler.',
      ar: 'إسفنج مطبخ وأدوات جلي ووسادات كاشطة.',
    },
  },
  {
    key: 'seed-paper',
    parent: 'seed-hygiene',
    name: { en: 'Paper Products', tr: 'Kağıt Ürünleri', ar: 'المنتجات الورقية' },
    desc: {
      en: 'Kitchen rolls, hand towels and tissue.',
      tr: 'Kağıt havlu, el havlusu ve peçete.',
      ar: 'لفات مطبخ ومناشف يد ومناديل.',
    },
  },
  {
    key: 'seed-bath',
    parent: 'seed-hygiene',
    name: { en: 'Bath & Shower', tr: 'Banyo ve Duş', ar: 'الحمام والاستحمام' },
    desc: {
      en: 'Bath puffs, loofahs and personal washing accessories.',
      tr: 'Banyo lifleri, keseler ve kişisel yıkama aksesuarları.',
      ar: 'ليف الاستحمام والليفة وملحقات الاغتسال الشخصي.',
    },
  },
  {
    key: 'seed-twine',
    parent: 'seed-packaging',
    name: { en: 'Twine & Rope', tr: 'İp ve Halat', ar: 'الخيوط والحبال' },
    desc: {
      en: 'Jute, polypropylene and PVC twine and rope for bundling and baling.',
      tr: 'Paketleme ve balyalama için jüt, polipropilen ve PVC ip ve halat.',
      ar: 'خيوط وحبال من الجوت والبولي بروبيلين والبي في سي للتحزيم والبالات.',
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
  /**
   * Bare R2 key, never an absolute URL — `resolveImageUrl()` prepends the host,
   * so swapping r2.dev for images.tavkil.com needs no migration.
   */
  image: string;
  name: Tri;
  desc: Tri;
}[] = [
  // ─── Cleaning ──────────────────────────────────────────────────────────────
  {
    key: 'seed-p-01',
    category: 'seed-cloths',
    supplier: 'seed-supplier-a',
    unit: 'pack',
    moq: 24,
    price: '2.40',
    featured: true,
    image: 'products/microfibre-cloth-set.jpg',
    name: {
      en: 'Microfibre Cloth Set (5 pc)',
      tr: 'Mikrofiber Bez Seti (5 adet)',
      ar: 'طقم مناشف ميكروفايبر (5 قطع)',
    },
    desc: {
      en: 'Lint-free microfibre cloths in five colours for colour-coded cleaning.',
      tr: 'Renk kodlu temizlik için beş renkte tüy bırakmayan mikrofiber bezler.',
      ar: 'مناشف ميكروفايبر لا تترك وبراً، بخمسة ألوان للتنظيف المُرمَّز لونياً.',
    },
  },
  {
    key: 'seed-p-02',
    category: 'seed-mops',
    supplier: 'seed-supplier-a',
    unit: 'pc',
    moq: 48,
    price: '1.85',
    image: 'products/spin-mop-refill.jpg',
    name: {
      en: 'Spin Mop Refill Head',
      tr: 'Döner Mop Yedek Başlığı',
      ar: 'رأس ممسحة دوّارة بديل',
    },
    desc: {
      en: 'Microfibre replacement head for standard 360° spin mop buckets.',
      tr: 'Standart 360° döner mop kovaları için mikrofiber yedek başlık.',
      ar: 'رأس ميكروفايبر بديل لدلاء الممسحة الدوّارة 360° القياسية.',
    },
  },
  {
    key: 'seed-p-03',
    category: 'seed-mops',
    supplier: 'seed-supplier-a',
    unit: 'pc',
    moq: 50,
    price: '1.20',
    featured: true,
    image: 'products/cotton-mop-head.jpg',
    name: { en: 'Cotton Mop Head 350g', tr: 'Pamuk Mop Başlığı 350g', ar: 'رأس ممسحة قطني 350 جم' },
    desc: {
      en: 'Absorbent cotton yarn mop head with a reinforced collar.',
      tr: 'Takviyeli bilezikli, emici pamuk iplikli mop başlığı.',
      ar: 'رأس ممسحة من خيوط القطن الماصة بطوق مُقوّى.',
    },
  },
  {
    key: 'seed-p-04',
    category: 'seed-sponges',
    supplier: 'seed-supplier-a',
    unit: 'pack',
    moq: 60,
    price: '0.95',
    image: 'products/sponge-scourer.jpg',
    name: {
      en: 'Sponge Scourer (6 pc)',
      tr: 'Sünger Ovma Teli (6 adet)',
      ar: 'إسفنجة جلي (6 قطع)',
    },
    desc: {
      en: 'Two-layer sponge with an abrasive backing for pots and worktops.',
      tr: 'Tencere ve tezgâhlar için aşındırıcı yüzeyli çift katmanlı sünger.',
      ar: 'إسفنجة مزدوجة الطبقة بوجه كاشط للأواني وأسطح العمل.',
    },
  },
  {
    key: 'seed-p-05',
    category: 'seed-mops',
    supplier: 'seed-supplier-a',
    unit: 'pc',
    moq: 20,
    price: '6.40',
    image: 'products/flat-floor-mop.jpg',
    name: {
      en: 'Flat Floor Mop 40cm',
      tr: 'Yassı Zemin Mopu 40cm',
      ar: 'ممسحة أرضيات مسطحة 40 سم',
    },
    desc: {
      en: 'Aluminium flat mop frame with telescopic handle and microfibre pad.',
      tr: 'Teleskopik saplı alüminyum yassı mop iskeleti ve mikrofiber ped.',
      ar: 'هيكل ممسحة مسطحة من الألمنيوم بمقبض تلسكوبي ووسادة ميكروفايبر.',
    },
  },
  // ─── Paper & Hygiene ───────────────────────────────────────────────────────
  {
    key: 'seed-p-06',
    category: 'seed-paper',
    supplier: 'seed-supplier-b',
    unit: 'pack',
    moq: 36,
    price: '2.10',
    featured: true,
    image: 'products/kitchen-towel-roll.jpg',
    name: {
      en: 'Kitchen Towel Roll (2 pc)',
      tr: 'Kağıt Havlu Rulosu (2 adet)',
      ar: 'لفة مناشف مطبخ (قطعتان)',
    },
    desc: {
      en: 'Two-ply embossed kitchen roll, perforated sheets.',
      tr: 'Çift katlı gofrajlı kağıt havlu, perforeli yapraklar.',
      ar: 'لفة مطبخ مزدوجة الطبقة منقوشة بأوراق مثقّبة.',
    },
  },
  {
    key: 'seed-p-07',
    category: 'seed-bath',
    supplier: 'seed-supplier-b',
    unit: 'pc',
    moq: 100,
    price: '0.70',
    image: 'products/bath-sponge-puff.jpg',
    name: { en: 'Bath Sponge Puff', tr: 'Banyo Lifi', ar: 'ليفة استحمام' },
    desc: {
      en: 'Mesh bath puff with a hanging loop, assorted colours.',
      tr: 'Askı ipli file banyo lifi, karışık renkli.',
      ar: 'ليفة استحمام شبكية بحلقة تعليق، بألوان متنوعة.',
    },
  },
  {
    key: 'seed-p-08',
    category: 'seed-bath',
    supplier: 'seed-supplier-b',
    unit: 'pack',
    moq: 40,
    price: '2.60',
    image: 'products/shower-puff-set.jpg',
    name: {
      en: 'Shower Puff Set (4 pc)',
      tr: 'Duş Lifi Seti (4 adet)',
      ar: 'طقم ليف استحمام (4 قطع)',
    },
    desc: {
      en: 'Retail-ready set of four shower puffs on a display hook.',
      tr: 'Teşhir askısında perakendeye hazır dört adet duş lifi seti.',
      ar: 'طقم من أربع ليف استحمام جاهز للبيع بالتجزئة على خطاف عرض.',
    },
  },
  // ─── Packaging ─────────────────────────────────────────────────────────────
  {
    key: 'seed-p-09',
    category: 'seed-twine',
    supplier: 'seed-supplier-b',
    unit: 'pc',
    moq: 24,
    price: '1.95',
    image: 'products/jute-twine-ball.jpg',
    name: { en: 'Jute Twine Ball 200g', tr: 'Jüt İp Yumağı 200g', ar: 'كرة خيط جوت 200 جم' },
    desc: {
      en: 'Natural jute twine for bundling, craft and retail packaging.',
      tr: 'Paketleme, el işi ve perakende ambalaj için doğal jüt ip.',
      ar: 'خيط جوت طبيعي للتحزيم والحِرف وتغليف التجزئة.',
    },
  },
  {
    key: 'seed-p-10',
    category: 'seed-twine',
    supplier: 'seed-supplier-b',
    unit: 'spool',
    moq: 10,
    price: '18.50',
    featured: true,
    image: 'products/pp-baler-twine.jpg',
    name: {
      en: 'PP Baler Twine Spool',
      tr: 'PP Balya İpi Makarası',
      ar: 'بكرة خيط تحزيم بولي بروبيلين',
    },
    desc: {
      en: 'UV-stabilised polypropylene twine on a bulk spool for baling.',
      tr: 'Balyalama için toplu makarada UV dayanımlı polipropilen ip.',
      ar: 'خيط بولي بروبيلين مقاوم للأشعة فوق البنفسجية على بكرة كبيرة للتحزيم.',
    },
  },
  {
    key: 'seed-p-11',
    category: 'seed-twine',
    supplier: 'seed-supplier-b',
    unit: 'spool',
    moq: 8,
    price: '24.00',
    image: 'products/pp-rope-8mm.jpg',
    name: {
      en: 'Polypropylene Rope 8mm',
      tr: 'Polipropilen Halat 8mm',
      ar: 'حبل بولي بروبيلين 8 مم',
    },
    desc: {
      en: 'Braided 8mm PP rope, rot-resistant and suitable for outdoor use.',
      tr: 'Örgülü 8mm PP halat; çürümeye dayanıklı, dış mekâna uygun.',
      ar: 'حبل بولي بروبيلين مجدول 8 مم، مقاوم للتعفّن وصالح للاستخدام الخارجي.',
    },
  },
  {
    key: 'seed-p-12',
    category: 'seed-twine',
    supplier: 'seed-supplier-b',
    unit: 'coil',
    moq: 6,
    price: '31.00',
    image: 'products/pvc-coil-rope.jpg',
    name: { en: 'PVC Coil Rope', tr: 'PVC Bobin Halat', ar: 'حبل بي في سي ملفوف' },
    desc: {
      en: 'PVC-coated rope supplied on a coil for clothes lines and tie-downs.',
      tr: 'Çamaşır ipi ve bağlama için bobin halinde PVC kaplı halat.',
      ar: 'حبل مغلّف بالبي في سي يُورَّد على بكرة لحبال الغسيل والتثبيت.',
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
  // Roots first, so a child's parent id always exists by the time it is inserted.
  // CATEGORIES is authored roots-then-children, but sorting makes that explicit
  // rather than load-bearing on array order.
  const ordered = [...CATEGORIES].sort((a, b) => Number(!!a.parent) - Number(!!b.parent));
  for (const c of ordered) {
    const [row] = await db
      .insert(categories)
      .values({
        status: 'published',
        displayOrder: order++,
        parentId: c.parent ? categoryIds.get(c.parent) : null,
      })
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

    // Real product photography, resized to 1600px and uploaded to the `IMAGES`
    // R2 bucket under `products/`. Stored as a bare key — see
    // `lib/media/image-url.ts` for why absolute URLs would cost a migration.
    await db.insert(productImages).values([
      {
        productId: row.id,
        url: p.image,
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
