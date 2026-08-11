/**
 * The written half of the Temsan catalogue: names and copy in all three locales.
 *
 * Everything factual — price, barcode, carton quantity, CBM, weight, photos —
 * comes from `data.json`, which is generated from Temsan's own price list and
 * photo folders. The two are joined by product code at import time.
 *
 * The split is deliberate. When Temsan sends the next price list, `data.json` is
 * regenerated and the English and Arabic copy below survives untouched. Merging
 * them into one file would mean re-authoring 82 products to change a price.
 *
 * Turkish is the source language: `nameTr` in `data.json` is the supplier's own
 * wording, kept verbatim so a row can always be traced back to the price list.
 * The Turkish here is that wording tidied for a storefront — the trade shorthand
 * that means nothing to a buyer ("KARTELALI", "{20'Lİ}", the brand suffix) moves
 * into attributes or drops out.
 */

export type Locale = 'en' | 'tr' | 'ar';
export type Tri = Record<Locale, string>;

export interface TemsanCategory {
  /** Stable key; also the slug prefix, so re-running never orphans a URL. */
  key: string;
  /** Parent category key. Absent for the two roots. */
  parent?: string;
  /** The ANA/ALT KATEGORİ value in the supplier's sheet that maps here. */
  trSource: string;
  /** lucide-react icon name shown in the storefront category rail. */
  icon: string;
  name: Tri;
  desc: Tri;
}

export interface TemsanProduct {
  /** First variant code of the family — the join key into data.json. */
  code: string;
  name: Tri;
  desc: Tri;
  /**
   * Label for the variant axis, when the family has one. The values themselves
   * (25 cm, 40 cm…) are measurements and are formatted, not translated.
   */
  option?: Tri;
}

// ── Categories ───────────────────────────────────────────────────────────────
// Two roots and fourteen children, exactly the ANA/ALT KATEGORİ pairs that
// survive the "has both a price and a photo" filter. No invented tiers: a
// sub-category exists here only because products landed in it.

export const CATEGORIES: TemsanCategory[] = [
  {
    key: 'cleaning',
    trSource: 'TEMİZLİK',
    icon: 'SprayCan',
    name: { en: 'Cleaning', tr: 'Temizlik', ar: 'التنظيف' },
    desc: {
      en: 'Cloths, sponges, mops and car care made in Türkiye for wholesale and export.',
      tr: 'Toptan ve ihracat için Türkiye’de üretilen bez, sünger, mop ve oto bakım ürünleri.',
      ar: 'مماسح وأقمشة وإسفنج ومستلزمات العناية بالسيارات، صناعة تركية للبيع بالجملة والتصدير.',
    },
  },
  {
    key: 'hardware',
    trSource: 'HIRDAVAT',
    icon: 'Wrench',
    name: { en: 'Hardware', tr: 'Hırdavat', ar: 'الأدوات' },
    desc: {
      en: 'Ropes, twines, steel wire and hoses for household, garden and packing use.',
      tr: 'Ev, bahçe ve paketleme için ipler, halatlar, çelik teller ve hortumlar.',
      ar: 'حبال وخيوط وأسلاك فولاذية وخراطيم للاستخدام المنزلي والحدائق والتغليف.',
    },
  },

  // Cleaning
  {
    key: 'floor-cleaning',
    parent: 'cleaning',
    trSource: 'YER TEMİZLİĞİ',
    icon: 'Footprints',
    name: { en: 'Floor Cleaning', tr: 'Yer Temizliği', ar: 'تنظيف الأرضيات' },
    desc: {
      en: 'Mops, mop refills and flat-mop frames in welsoft, microfibre and cord.',
      tr: 'Welsoft, mikrofiber ve iplik mop, mop yedeği ve palet aparatları.',
      ar: 'مماسح ورؤوس بديلة وحوامل مسطحة من الولسوفت والألياف الدقيقة والخيط.',
    },
  },
  {
    key: 'general-cleaning',
    parent: 'cleaning',
    trSource: 'GENEL TEMİZLİK',
    icon: 'Sparkles',
    name: { en: 'General Cleaning', tr: 'Genel Temizlik', ar: 'التنظيف العام' },
    desc: {
      en: 'Microfibre and plush cloths for everyday surface cleaning, loose or in sets.',
      tr: 'Günlük yüzey temizliği için mikrofiber ve peluş bezler; tekli veya setli.',
      ar: 'أقمشة من الألياف الدقيقة والوبر لتنظيف الأسطح اليومي، مفردة أو في أطقم.',
    },
  },
  {
    key: 'dishwashing',
    parent: 'cleaning',
    trSource: 'BULAŞIK',
    icon: 'Utensils',
    name: { en: 'Dishwashing', tr: 'Bulaşık', ar: 'غسيل الأطباق' },
    desc: {
      en: 'Dish sponges, stainless scourers and draining mats for kitchen and catering.',
      tr: 'Mutfak ve toplu tüketim için bulaşık süngerleri, inox teller ve bulaşık altlıkları.',
      ar: 'إسفنج غسيل وسلك ستانلس وحصائر تجفيف للمطابخ والمطاعم.',
    },
  },
  {
    key: 'glass-cleaning',
    parent: 'cleaning',
    trSource: 'CAM TEMİZLİĞİ',
    icon: 'PanelsTopLeft',
    name: { en: 'Glass Cleaning', tr: 'Cam Temizliği', ar: 'تنظيف الزجاج' },
    desc: {
      en: 'Diamond-weave and piqué cloths that clear glass without lint or streaks.',
      tr: 'Camı iz ve tüy bırakmadan temizleyen baklava desenli ve lacost bezler.',
      ar: 'أقمشة بنقشة معينية ونسيج بيكيه تنظف الزجاج دون خيوط أو خطوط.',
    },
  },
  {
    key: 'car-care',
    parent: 'cleaning',
    trSource: 'OTOMOBİL TEMİZLİĞİ',
    icon: 'Car',
    name: { en: 'Car Care', tr: 'Otomobil Temizliği', ar: 'العناية بالسيارات' },
    desc: {
      en: 'Drying cloths, wash sponges and mitts sized for vehicle bodywork.',
      tr: 'Araç kaportası için kurulama bezleri, yıkama süngerleri ve eldivenler.',
      ar: 'أقمشة تجفيف وإسفنج غسيل وقفازات بمقاسات مناسبة لهيكل السيارة.',
    },
  },
  {
    key: 'bath',
    parent: 'cleaning',
    trSource: 'BANYO',
    icon: 'ShowerHead',
    name: { en: 'Bath', tr: 'Banyo', ar: 'الحمام' },
    desc: {
      en: 'Bath puffs and sponges in retail-ready display packs.',
      tr: 'Perakendeye hazır standlı kolilerde banyo lifi ve süngerleri.',
      ar: 'ليف وإسفنج استحمام في عبوات عرض جاهزة للبيع بالتجزئة.',
    },
  },

  // Hardware
  {
    key: 'clotheslines',
    parent: 'hardware',
    trSource: 'ÇAMAŞIR ASMA VE KURUTMA İPLERİ',
    icon: 'Shirt',
    name: { en: 'Clotheslines', tr: 'Çamaşır İpleri', ar: 'حبال الغسيل' },
    desc: {
      en: 'Nylon, PVC-coated steel and polyester lines in 6 to 20 metre lengths.',
      tr: '6 ile 20 metre arası naylon, PVC kaplı çelik ve polyester çamaşır ipleri.',
      ar: 'حبال نايلون وفولاذ مغلف بالـPVC وبوليستر بأطوال من 6 إلى 20 مترًا.',
    },
  },
  {
    key: 'multi-purpose-rope',
    parent: 'hardware',
    trSource: 'ÇOK AMAÇLI İPLER',
    icon: 'Cable',
    name: { en: 'Multi-Purpose Rope', tr: 'Çok Amaçlı İpler', ar: 'حبال متعددة الاستخدامات' },
    desc: {
      en: 'Round and flat utility rope for tying down, hanging and general site use.',
      tr: 'Bağlama, asma ve genel şantiye kullanımı için yuvarlak ve yassı ipler.',
      ar: 'حبال دائرية ومسطحة للربط والتعليق والاستخدامات العامة.',
    },
  },
  {
    key: 'jute-twine',
    parent: 'hardware',
    trSource: 'JÜT İPLERİ',
    icon: 'Spool',
    name: { en: 'Jute Twine', tr: 'Jüt İpleri', ar: 'خيوط الجوت' },
    desc: {
      en: 'Natural jute twine for parcels, garden work and decorative use.',
      tr: 'Paket, bahçe ve dekorasyon işleri için doğal jüt kırnap ipi.',
      ar: 'خيوط جوت طبيعية للطرود وأعمال الحدائق والاستخدام الزخرفي.',
    },
  },
  {
    key: 'kite-string',
    parent: 'hardware',
    trSource: 'UÇURTMA İPLERİ',
    icon: 'Wind',
    name: { en: 'Kite String', tr: 'Uçurtma İpleri', ar: 'خيط الطائرات الورقية' },
    desc: {
      en: 'Wound kite string on spools, packed 20 to the pack.',
      tr: 'Makaraya sarılı, 20’li paketlerde uçurtma ipi.',
      ar: 'خيط طائرات ورقية ملفوف على بكرات، 20 قطعة في العبوة.',
    },
  },
  {
    key: 'packaging-twine',
    parent: 'hardware',
    trSource: 'AMBALAJ İPLERİ',
    icon: 'Package',
    name: { en: 'Packaging Twine', tr: 'Ambalaj İpleri', ar: 'خيوط التغليف' },
    desc: {
      en: 'Polypropylene twine by weight for parcels, bundling and sack closing.',
      tr: 'Paketleme, bağlama ve çuval ağzı dikimi için kilo bazlı polipropilen ip.',
      ar: 'خيوط بولي بروبيلين بالوزن للطرود والتجميع وإغلاق الأكياس.',
    },
  },
  {
    key: 'hoses',
    parent: 'hardware',
    trSource: 'HORTUMLAR',
    icon: 'Waves',
    name: { en: 'Hoses', tr: 'Hortumlar', ar: 'الخراطيم' },
    desc: {
      en: 'Reinforced garden hose supplied in fixed coil lengths.',
      tr: 'Sabit boylarda takviyeli bahçe hortumu.',
      ar: 'خراطيم حدائق مقواة تُورّد بأطوال ملفوفة ثابتة.',
    },
  },
  {
    key: 'steel-wire-rope',
    parent: 'hardware',
    trSource: 'İZOLELİ ÇELİK HALATLAR',
    icon: 'Link',
    name: { en: 'Steel Wire Rope', tr: 'İzoleli Çelik Halatlar', ar: 'حبال فولاذية' },
    desc: {
      en: 'PVC-insulated steel wire rope from 2 to 10 mm, sold on 200 m reels.',
      tr: '2–10 mm arası PVC izoleli çelik halat, 200 metrelik makaralarda.',
      ar: 'حبال فولاذية معزولة بالـPVC من 2 إلى 10 مم على بكرات 200 متر.',
    },
  },
  {
    key: 'plaster-sponges',
    parent: 'hardware',
    trSource: 'SIVA SÜNGERLERİ',
    icon: 'Brush',
    name: { en: 'Plaster Sponges', tr: 'Sıva Süngerleri', ar: 'إسفنج المحارة' },
    desc: {
      en: 'Dense sponges for floating plaster, render and tile grout.',
      tr: 'Sıva, şap ve derz uygulamaları için yoğun dokulu süngerler.',
      ar: 'إسفنج عالي الكثافة لتسوية المحارة والقصارة وحشو البلاط.',
    },
  },
];

// ── Products ─────────────────────────────────────────────────────────────────
// One entry per family, keyed by its first variant code. Sizes and lengths are
// measurements, so they live on the variants and are formatted rather than
// translated; only the axis label is written out here.

const SIZE: Tri = { en: 'Size', tr: 'Ebat', ar: 'المقاس' };
const LENGTH: Tri = { en: 'Length', tr: 'Uzunluk', ar: 'الطول' };
const DIAMETER: Tri = { en: 'Diameter', tr: 'Çap', ar: 'القطر' };

export const PRODUCTS: TemsanProduct[] = [
  // ── Hardware / Packaging twine ─────────────────────────────────────────────
  {
    code: 'TM-210',
    name: { en: 'Packaging Twine 2 kg', tr: 'Ambalaj İpi 2 kg', ar: 'خيط تغليف 2 كجم' },
    desc: {
      en: 'Polypropylene packaging twine on a 2 kg roll for continuous bundling and parcel work.',
      tr: 'Sürekli bağlama ve paketleme işleri için 2 kg’lık makarada polipropilen ambalaj ipi.',
      ar: 'خيط تغليف من البولي بروبيلين على بكرة 2 كجم لأعمال الربط والتغليف المستمرة.',
    },
  },
  {
    code: 'TM-205',
    name: { en: 'Parcel Twine 500 g', tr: 'Paket İpi 500 g', ar: 'خيط طرود 500 جم' },
    desc: {
      en: 'Light 500 g roll of parcel twine sized for shop counters and dispatch desks.',
      tr: 'Mağaza kasası ve sevkiyat masası için 500 gramlık hafif paket ipi.',
      ar: 'بكرة خفيفة 500 جم من خيط الطرود مناسبة لطاولات المتاجر ومكاتب الشحن.',
    },
  },
  {
    code: 'TM-204',
    name: {
      en: 'Sack Closing Twine 1 kg',
      tr: 'Çuval Ağzı İpi 1 kg',
      ar: 'خيط إغلاق الأكياس 1 كجم',
    },
    desc: {
      en: 'Strong 1 kg twine for stitching and tying sack mouths in bulk handling.',
      tr: 'Dökme yüklemede çuval ağzı dikmek ve bağlamak için 1 kg’lık sağlam ip.',
      ar: 'خيط متين 1 كجم لخياطة وربط فوهات الأكياس في المناولة بالجملة.',
    },
  },

  // ── Hardware / Hoses ───────────────────────────────────────────────────────
  {
    code: 'TM-420',
    name: { en: 'Garden Hose 20 m', tr: 'Bahçe Hortumu 20 m', ar: 'خرطوم حديقة 20 م' },
    desc: {
      en: 'Reinforced 20 metre garden hose that stays flexible through the watering season.',
      tr: 'Sulama sezonu boyunca esnekliğini koruyan 20 metrelik takviyeli bahçe hortumu.',
      ar: 'خرطوم حديقة مقوى بطول 20 مترًا يحافظ على مرونته طوال موسم الري.',
    },
  },

  // ── Hardware / Jute twine ──────────────────────────────────────────────────
  {
    code: 'TM-135',
    name: {
      en: 'Multi-Purpose Jute Twine 10 m',
      tr: 'Çok Amaçlı Jüt Kırnap İpi 10 m',
      ar: 'خيط جوت متعدد الاستخدامات 10 م',
    },
    desc: {
      en: 'Ten metre hank of natural jute for parcels, plant ties and craft work.',
      tr: 'Paket, bitki bağı ve el işi için 10 metrelik doğal jüt çile.',
      ar: 'لفة جوت طبيعي بطول 10 أمتار للطرود وربط النباتات والأشغال اليدوية.',
    },
  },
  {
    code: 'TM-131',
    name: { en: 'Jute Twine Ball', tr: 'Jüt Kırnap İpi', ar: 'كرة خيط جوت' },
    desc: {
      en: 'Wound ball of natural jute twine, packed ten to the pack for retail.',
      tr: 'Perakende için 10’lu paketlerde sarılı doğal jüt kırnap ipi.',
      ar: 'كرة ملفوفة من خيط الجوت الطبيعي، 10 قطع في العبوة للبيع بالتجزئة.',
    },
  },

  // ── Hardware / Plaster sponges ─────────────────────────────────────────────
  {
    code: 'TM-515',
    name: { en: 'White Plaster Sponge', tr: 'Beyaz Sıva Süngeri', ar: 'إسفنجة محارة بيضاء' },
    desc: {
      en: 'Fine white sponge for finishing plaster and smoothing render before it sets.',
      tr: 'Sıvayı perdahlamak ve priz almadan yüzeyi düzeltmek için ince beyaz sünger.',
      ar: 'إسفنجة بيضاء ناعمة لتنعيم المحارة وتسوية القصارة قبل الجفاف.',
    },
  },
  {
    code: 'TM-520',
    name: { en: 'Combination Plaster Sponge', tr: 'Karma Sıva Süngeri', ar: 'إسفنجة محارة مزدوجة' },
    desc: {
      en: 'Two-density plaster sponge: a coarse face for grout, a fine face for finishing.',
      tr: 'Çift yoğunluklu sıva süngeri: derz için sert yüz, perdah için ince yüz.',
      ar: 'إسفنجة محارة بكثافتين: وجه خشن للحشو ووجه ناعم للتنعيم.',
    },
  },
  {
    code: 'TM-185',
    name: {
      en: 'Coloured Cleaning Sponge',
      tr: 'Renkli Temizlik Süngeri',
      ar: 'إسفنجة تنظيف ملونة',
    },
    desc: {
      en: 'Open-cell sponge in assorted colours for wiping down walls, tiles and site surfaces.',
      tr: 'Duvar, fayans ve şantiye yüzeylerini silmek için karışık renkli gözenekli sünger.',
      ar: 'إسفنجة مسامية بألوان متنوعة لمسح الجدران والبلاط وأسطح الموقع.',
    },
  },

  // ── Hardware / Kite string ─────────────────────────────────────────────────
  {
    code: 'TM-130',
    name: { en: 'Kite String', tr: 'Uçurtma İpi', ar: 'خيط طائرة ورقية' },
    desc: {
      en: 'Bright wound kite string on a hand spool, packed twenty to the pack.',
      tr: 'El makarasına sarılı canlı renkli uçurtma ipi, 20’li paketlerde.',
      ar: 'خيط طائرة ورقية بألوان زاهية على بكرة يدوية، 20 قطعة في العبوة.',
    },
  },

  // ── Hardware / Clotheslines ────────────────────────────────────────────────
  {
    code: 'TM-012',
    option: LENGTH,
    name: { en: 'Nylon Clothesline', tr: 'Naylon Çamaşır İpi', ar: 'حبل غسيل نايلون' },
    desc: {
      en: 'Braided nylon line that holds its tension outdoors, in 6, 8 and 20 metre lengths.',
      tr: 'Dışarıda gerginliğini koruyan örgü naylon ip; 6, 8 ve 20 metre boylarında.',
      ar: 'حبل نايلون مجدول يحافظ على شدّه في الخارج، بأطوال 6 و8 و20 مترًا.',
    },
  },
  {
    code: 'TM-412',
    option: LENGTH,
    name: {
      en: 'PVC-Coated Polyester Clothesline',
      tr: 'PVC Kaplı Polyester Çamaşır İpi',
      ar: 'حبل غسيل بوليستر مغلف بالـPVC',
    },
    desc: {
      en: 'Polyester core in a PVC jacket — wipes clean and will not mark washing.',
      tr: 'PVC kaplı polyester öz; silinerek temizlenir ve çamaşırda iz bırakmaz.',
      ar: 'قلب بوليستر بغلاف PVC — يُمسح بسهولة ولا يترك أثرًا على الغسيل.',
    },
  },
  {
    code: 'TM-010',
    option: LENGTH,
    name: {
      en: 'PVC-Coated Steel Clothesline',
      tr: 'PVC Kaplı Çelik Çamaşır İpi',
      ar: 'حبل غسيل فولاذي مغلف بالـPVC',
    },
    desc: {
      en: 'Steel-cored line in a PVC jacket for long spans that must not sag.',
      tr: 'Sarkmaması gereken uzun açıklıklar için PVC kaplı çelik özlü ip.',
      ar: 'حبل بقلب فولاذي وغلاف PVC للمسافات الطويلة التي يجب ألا ترتخي.',
    },
  },

  // ── Hardware / Multi-purpose rope ──────────────────────────────────────────
  {
    code: 'TM-134',
    name: {
      en: 'Flat Multi-Purpose Rope 10 m',
      tr: 'Yassı Çok Amaçlı İp 10 m',
      ar: 'حبل مسطح متعدد الاستخدامات 10 م',
    },
    desc: {
      en: 'Flat woven rope that grips a knot well and lies flat against a load.',
      tr: 'Düğümü iyi tutan ve yük üzerinde yatık duran yassı örgü ip.',
      ar: 'حبل منسوج مسطح يمسك العقدة جيدًا ويستقر مستويًا على الحمولة.',
    },
  },
  {
    code: 'TM-132',
    name: {
      en: 'Multi-Purpose Rope 10 m',
      tr: 'Çok Amaçlı İp 10 m',
      ar: 'حبل متعدد الاستخدامات 10 م',
    },
    desc: {
      en: 'Ten metre round utility rope for tying down, hanging and everyday site work.',
      tr: 'Bağlama, asma ve günlük şantiye işleri için 10 metrelik yuvarlak ip.',
      ar: 'حبل دائري بطول 10 أمتار للربط والتعليق وأعمال الموقع اليومية.',
    },
  },
  {
    code: 'TM-133',
    name: {
      en: 'Multi-Purpose Rope 20 m',
      tr: 'Çok Amaçlı İp 20 m',
      ar: 'حبل متعدد الاستخدامات 20 م',
    },
    desc: {
      en: 'Twenty metre round utility rope for longer runs and heavier bundling.',
      tr: 'Daha uzun mesafeler ve ağır bağlamalar için 20 metrelik yuvarlak ip.',
      ar: 'حبل دائري بطول 20 مترًا للمسافات الأطول والربط الأثقل.',
    },
  },

  // ── Hardware / Steel wire rope ─────────────────────────────────────────────
  {
    code: 'TM-211',
    option: DIAMETER,
    name: {
      en: 'PVC-Insulated Steel Wire Rope',
      tr: 'İzoleli Çelik Halat',
      ar: 'حبل فولاذي معزول',
    },
    desc: {
      en: 'Galvanised steel rope in a PVC jacket, on 200 metre reels from 2 to 10 mm.',
      tr: '2–10 mm arası, 200 metrelik makaralarda PVC kaplı galvanizli çelik halat.',
      ar: 'حبل فولاذي مجلفن بغلاف PVC على بكرات 200 متر بأقطار من 2 إلى 10 مم.',
    },
  },

  // ── Cleaning / Bath ────────────────────────────────────────────────────────
  {
    code: 'TM-772',
    name: { en: 'Bath Puff', tr: 'Banyo Lifi', ar: 'ليفة استحمام' },
    desc: {
      en: 'Mesh bath puff in assorted colours, supplied in a counter display box.',
      tr: 'Standlı kolide, karışık renkli file banyo lifi.',
      ar: 'ليفة استحمام شبكية بألوان متنوعة تُورّد في صندوق عرض.',
    },
  },
  {
    code: 'TM-773',
    name: { en: 'Deluxe Bath Puff', tr: 'Banyo Lifi Lüx', ar: 'ليفة استحمام فاخرة' },
    desc: {
      en: 'Larger, denser bath puff that lathers more and holds its shape longer.',
      tr: 'Daha çok köpüren ve formunu daha uzun koruyan büyük, sık dokulu banyo lifi.',
      ar: 'ليفة استحمام أكبر وأكثف ترغي أكثر وتحافظ على شكلها لفترة أطول.',
    },
  },
  {
    code: 'RM-775',
    name: { en: 'Bath Sponge, Small', tr: 'Banyo Süngeri Küçük', ar: 'إسفنجة استحمام صغيرة' },
    desc: {
      en: 'Soft small-format bath sponge, packed in bulk cartons for hotel supply.',
      tr: 'Otel tedariği için dökme kolilerde yumuşak, küçük boy banyo süngeri.',
      ar: 'إسفنجة استحمام ناعمة صغيرة الحجم معبأة في كراتين للفنادق.',
    },
  },

  // ── Cleaning / Dishwashing ─────────────────────────────────────────────────
  {
    code: 'RM-753',
    name: {
      en: 'Classic Dish Sponge, 10-Pack',
      tr: 'Klasik Bulaşık Süngeri 10’lu',
      ar: 'إسفنج غسيل كلاسيكي، 10 قطع',
    },
    desc: {
      en: 'Everyday two-layer dish sponge with a scouring face, ten to the pack.',
      tr: 'Ovma yüzeyli, çift katlı günlük bulaşık süngeri; 10’lu pakette.',
      ar: 'إسفنجة غسيل يومية بطبقتين ووجه كاشط، 10 قطع في العبوة.',
    },
  },
  {
    code: 'TM-750',
    name: {
      en: 'Industrial Dish Sponge, 4-Pack',
      tr: 'Endüstriyel Bulaşık Süngeri 4’lü',
      ar: 'إسفنج غسيل صناعي، 4 قطع',
    },
    desc: {
      en: 'Thicker sponge with a hard-wearing scour face for catering kitchens.',
      tr: 'Toplu yemek mutfakları için dayanıklı ovma yüzeyli kalın sünger.',
      ar: 'إسفنجة أسمك بوجه كاشط متين لمطابخ المطاعم.',
    },
  },
  {
    code: 'RM-755',
    name: {
      en: 'Classic Dish Sponge, Large, 5-Pack',
      tr: 'Klasik Bulaşık Süngeri Büyük 5’li',
      ar: 'إسفنج غسيل كلاسيكي كبير، 5 قطع',
    },
    desc: {
      en: 'Large-format classic dish sponge for pans and trays, five to the pack.',
      tr: 'Tencere ve tepsiler için büyük boy klasik bulaşık süngeri; 5’li pakette.',
      ar: 'إسفنجة غسيل كلاسيكية كبيرة للأواني والصواني، 5 قطع في العبوة.',
    },
  },
  {
    code: 'TM-751',
    name: {
      en: 'Grooved Dish Sponge, 5-Pack',
      tr: 'Oluklu Bulaşık Süngeri 5’li',
      ar: 'إسفنج غسيل مخدد، 5 قطع',
    },
    desc: {
      en: 'Grooved profile that grips the hand wet and reaches into corners.',
      tr: 'Islakken elde kaymayan ve köşelere ulaşan oluklu profil.',
      ar: 'تصميم مخدد يمنع الانزلاق عند البلل ويصل إلى الزوايا.',
    },
  },
  {
    code: 'TM-620',
    name: { en: 'Dish Drying Mat', tr: 'Bulaşık Altlığı', ar: 'حصيرة تجفيف الأطباق' },
    desc: {
      en: 'Absorbent microfibre mat that drains washed dishes and rolls up to dry.',
      tr: 'Yıkanan bulaşığın suyunu çeken, rulo yapılıp kurutulabilen mikrofiber altlık.',
      ar: 'حصيرة ألياف دقيقة ماصة تصرّف ماء الأطباق وتُلف للتجفيف.',
    },
  },
  {
    code: 'TM-740',
    name: { en: 'Deluxe Dish Drying Mat', tr: 'Bulaşık Altlığı Lüx', ar: 'حصيرة تجفيف فاخرة' },
    desc: {
      en: 'Thicker, higher-pile drying mat that holds more water without spreading it.',
      tr: 'Daha çok su tutan, suyu yaymayan kalın ve yüksek havlı kurutma altlığı.',
      ar: 'حصيرة تجفيف أسمك بوبر أعلى تحتفظ بماء أكثر دون أن تنشره.',
    },
  },
  {
    code: 'TM-785',
    name: {
      en: 'Extra Stainless Scourer, 2-Pack',
      tr: 'Extra İnox Temizlik Süngeri 2’li',
      ar: 'سلك ستانلس إضافي، قطعتان',
    },
    desc: {
      en: 'Woven stainless mesh for burnt-on residue on pans, grills and hobs.',
      tr: 'Tencere, ızgara ve ocaktaki yanık kalıntılar için örgü inox tel.',
      ar: 'شبكة ستانلس منسوجة لإزالة البقايا المحترقة عن الأواني والشوايات.',
    },
  },
  {
    code: 'TM-624',
    name: {
      en: 'Mesh Dish Sponge, 3-Pack',
      tr: 'Fileli Bulaşık Süngeri 3’lü',
      ar: 'إسفنج غسيل بشبكة، 3 قطع',
    },
    desc: {
      en: 'Sponge wrapped in a scouring mesh that lifts residue without scratching.',
      tr: 'Çizmeden kalıntıyı kaldıran file kaplı sünger.',
      ar: 'إسفنجة مغلفة بشبكة كاشطة ترفع البقايا دون خدش.',
    },
  },
  {
    code: 'TM-460',
    name: {
      en: 'Mesh Dish Sponge, 3-Pack, Display Box',
      tr: 'Fileli Bulaşık Süngeri 3’lü Standlı',
      ar: 'إسفنج غسيل بشبكة، 3 قطع، صندوق عرض',
    },
    desc: {
      en: 'The mesh sponge three-pack supplied in a retail-ready counter display.',
      tr: 'Perakendeye hazır standlı kolide fileli sünger 3’lü paketi.',
      ar: 'عبوة الإسفنج الشبكي الثلاثية في صندوق عرض جاهز للبيع.',
    },
  },
  {
    code: 'TM-782',
    name: {
      en: 'Black Stainless Scourer, 2-Pack',
      tr: 'İnox Siyah Temizlik Süngeri 2’li',
      ar: 'سلك ستانلس أسود، قطعتان',
    },
    desc: {
      en: 'Black-coated stainless mesh, non-marking on stainless steel surfaces.',
      tr: 'Paslanmaz yüzeylerde iz bırakmayan siyah kaplı inox tel.',
      ar: 'شبكة ستانلس بطلاء أسود لا تترك أثرًا على الأسطح الستانلس.',
    },
  },

  // ── Cleaning / Glass cleaning ──────────────────────────────────────────────
  {
    code: 'TM-612',
    name: {
      en: 'Diamond-Weave Glass Cloth 30×40 cm, 4-Pack',
      tr: 'Baklava Desenli Cam Bezi 30×40 cm 4’lü',
      ar: 'قماش زجاج بنقشة معينية 30×40 سم، 4 قطع',
    },
    desc: {
      en: 'Four diamond-weave glass cloths on a header card for shelf display.',
      tr: 'Rafta sergilenmek üzere kartelalı dört adet baklava desenli cam bezi.',
      ar: 'أربع قطع قماش زجاج بنقشة معينية على بطاقة تعليق للعرض.',
    },
  },
  {
    code: 'TM-611',
    option: SIZE,
    name: {
      en: 'Diamond-Weave Glass Cloth',
      tr: 'Baklava Desenli Cam Bezi',
      ar: 'قماش زجاج بنقشة معينية',
    },
    desc: {
      en: 'Diamond-weave microfibre that clears glass dry, without lint or streaking.',
      tr: 'Camı kuru olarak, tüy ve iz bırakmadan temizleyen baklava desenli mikrofiber.',
      ar: 'ألياف دقيقة بنقشة معينية تنظف الزجاج جافًا دون خيوط أو خطوط.',
    },
  },
  {
    code: 'TM-712',
    name: {
      en: 'Piqué Cloth 40×50 cm, Wrapped',
      tr: 'Lacost Bez 40×50 cm Ambalajlı',
      ar: 'قماش بيكيه 40×50 سم، مغلف',
    },
    desc: {
      en: 'Individually wrapped piqué-weave cloth for glass, mirrors and display cases.',
      tr: 'Cam, ayna ve vitrin için tek tek ambalajlanmış lacost dokulu bez.',
      ar: 'قماش بنسيج بيكيه مغلف فرديًا للزجاج والمرايا وواجهات العرض.',
    },
  },
  {
    code: 'TM-713',
    name: {
      en: 'Piqué Cloth 40×50 cm, Bulk',
      tr: 'Lacost Bez 40×50 cm Dökme',
      ar: 'قماش بيكيه 40×50 سم، سائب',
    },
    desc: {
      en: 'The same piqué cloth supplied loose in bulk cartons for contract cleaning.',
      tr: 'Aynı lacost bezin, taahhüt temizliği için dökme kolilerde hâli.',
      ar: 'نفس قماش البيكيه يُورّد سائبًا في كراتين لعقود التنظيف.',
    },
  },

  // ── Cleaning / General cleaning ────────────────────────────────────────────
  {
    code: 'TM-475',
    name: {
      en: 'Microfibre Cloth 25×35 cm, 4-Pack',
      tr: 'Mikrofiber Bez 25×35 cm 4’lü',
      ar: 'قماش ألياف دقيقة 25×35 سم، 4 قطع',
    },
    desc: {
      en: 'Ultrasonically cut edges that will not fray or shed through repeated washing.',
      tr: 'Tekrarlanan yıkamalarda sökülmeyen ve tüy bırakmayan ultrasonik kesim kenarlar.',
      ar: 'حواف مقصوصة بالموجات فوق الصوتية لا تتنسل مع تكرار الغسيل.',
    },
  },
  {
    code: 'TM-600',
    name: {
      en: 'Microfibre Cleaning Cloth 30×40 cm, 4-Pack',
      tr: 'Mikrofiber Temizlik Bezi 30×40 cm 4’lü',
      ar: 'قماش تنظيف ألياف دقيقة 30×40 سم، 4 قطع',
    },
    desc: {
      en: 'Four colour-coded cloths on a header card, so tasks stay separated.',
      tr: 'İşleri ayrı tutmak için kartelada dört renkli bez.',
      ar: 'أربع قطع بألوان مميزة على بطاقة تعليق لفصل المهام.',
    },
  },
  {
    code: 'TM-720',
    name: { en: 'Cleaning Cloth, 9-Pack', tr: 'Temizlik Bezi 9’lu', ar: 'قماش تنظيف، 9 قطع' },
    desc: {
      en: 'Bulk nine-pack of general-purpose cloths for high-turnover cleaning.',
      tr: 'Yoğun kullanım için 9’lu genel amaçlı temizlik bezi paketi.',
      ar: 'عبوة من 9 قطع قماش متعدد الاستخدامات للتنظيف كثيف الاستعمال.',
    },
  },
  {
    code: 'TM-163',
    name: {
      en: 'Micro Plush Cloth, 3-Piece Set',
      tr: 'Mikro Peluş Bez 3’lü Set',
      ar: 'قماش وبري ناعم، طقم 3 قطع',
    },
    desc: {
      en: 'High-pile plush that lifts dust dry and polishes without a chemical.',
      tr: 'Tozu kuru olarak alan ve kimyasalsız parlatan yüksek havlı peluş.',
      ar: 'وبر عالي الكثافة يلتقط الغبار جافًا ويلمّع دون مواد كيميائية.',
    },
  },
  {
    code: 'TM-164',
    name: {
      en: 'Micro Plush Cloth, 4-Piece Set',
      tr: 'Mikro Peluş Bez 4’lü Set',
      ar: 'قماش وبري ناعم، طقم 4 قطع',
    },
    desc: {
      en: 'Four-piece plush set in assorted colours for room-by-room cleaning.',
      tr: 'Oda oda temizlik için karışık renkli 4’lü peluş set.',
      ar: 'طقم من 4 قطع وبرية بألوان متنوعة للتنظيف غرفة بغرفة.',
    },
  },
  {
    code: 'TM-618',
    name: {
      en: 'Micro Plush Cleaning Cloth 40×40 cm',
      tr: 'Mikro Peluş Temizlik Bezi 40×40 cm',
      ar: 'قماش تنظيف وبري 40×40 سم',
    },
    desc: {
      en: 'Large plush cloth for dashboards, worktops and painted surfaces.',
      tr: 'Torpido, tezgah ve boyalı yüzeyler için büyük peluş bez.',
      ar: 'قماش وبري كبير للوحات القيادة وأسطح العمل والأسطح المطلية.',
    },
  },
  {
    code: 'TM-715',
    name: {
      en: 'Microfibre Cloth, 4-Pack, Overlocked',
      tr: 'Mikrofiber Bez 4’lü Overloklu',
      ar: 'قماش ألياف دقيقة، 4 قطع، بحواف مخيطة',
    },
    desc: {
      en: 'Overlocked edges hold the weave together through commercial laundering.',
      tr: 'Endüstriyel yıkamada dokuyu bir arada tutan overlok kenarlar.',
      ar: 'حواف مخيطة تحافظ على تماسك النسيج في الغسيل التجاري.',
    },
  },
  {
    code: 'TM-465',
    name: {
      en: 'Microfibre Cloth 30×30 cm, 4-Pack, Overlocked',
      tr: 'Mikrofiber Bez 30×30 cm 4’lü Overloklu',
      ar: 'قماش ألياف دقيقة 30×30 سم، 4 قطع، بحواف مخيطة',
    },
    desc: {
      en: 'Square 30 cm cloths with sewn edges, sized to fold into quarters.',
      tr: 'Dörde katlanacak ölçüde, dikişli kenarlı 30 cm kare bezler.',
      ar: 'قطع مربعة 30 سم بحواف مخيطة بمقاس يسمح بطيّها إلى أرباع.',
    },
  },
  {
    code: 'TM-468',
    name: {
      en: 'Microfibre Cloth 30×30 cm, 4-Pack, Ultrasonic',
      tr: 'Mikrofiber Bez 30×30 cm 4’lü Ultrasonik',
      ar: 'قماش ألياف دقيقة 30×30 سم، 4 قطع، قص فوق صوتي',
    },
    desc: {
      en: 'Ultrasonically sealed edges keep the cloth flat with no seam to trap dirt.',
      tr: 'Ultrasonik kapatılmış kenarlar bezi düz tutar, kir tutan dikiş bırakmaz.',
      ar: 'حواف مغلقة بالموجات فوق الصوتية تبقي القماش مستويًا دون خياطة تحتجز الأوساخ.',
    },
  },
  {
    code: 'TM-605',
    name: {
      en: 'Microfibre Cleaning Cloth 30×40 cm',
      tr: 'Mikrofiber Temizlik Bezi 30×40 cm',
      ar: 'قماش تنظيف ألياف دقيقة 30×40 سم',
    },
    desc: {
      en: 'The everyday microfibre cloth, packed twenty to the pack for volume buyers.',
      tr: 'Toplu alım için 20’li paketlerde günlük kullanım mikrofiber bezi.',
      ar: 'قماش الألياف الدقيقة اليومي، 20 قطعة في العبوة لمشتري الكميات.',
    },
  },
  {
    code: 'TM-058',
    name: {
      en: 'Premium Cleaning Cloth, 3-Pack',
      tr: 'Premium Temizlik Bezi 3’lü',
      ar: 'قماش تنظيف ممتاز، 3 قطع',
    },
    desc: {
      en: 'Heavier premium weave with a denser pile and a longer service life.',
      tr: 'Daha sık havlı, daha uzun ömürlü ağır premium dokuma.',
      ar: 'نسيج ممتاز أثقل بوبر أكثف وعمر خدمة أطول.',
    },
  },
  {
    code: 'TM-721',
    name: {
      en: 'Perforated Cleaning Cloth Roll, 15 Sheets',
      tr: 'Rulo Perfore Temizlik Bezi 15 Yaprak',
      ar: 'لفة قماش تنظيف مثقب، 15 ورقة',
    },
    desc: {
      en: 'Tear-off cloth roll — use a sheet, rinse it, or throw it away.',
      tr: 'Koparmalı bez rulosu — bir yaprak kullan, durula ya da at.',
      ar: 'لفة قماش قابلة للتمزيق — استخدم ورقة، اشطفها أو تخلص منها.',
    },
  },
  {
    code: 'TM-051',
    name: {
      en: 'Perforated Cleaning Cloth Roll, 20 Sheets',
      tr: 'Rulo Perfore Temizlik Bezi 20 Yaprak',
      ar: 'لفة قماش تنظيف مثقب، 20 ورقة',
    },
    desc: {
      en: 'Twenty-sheet roll for kitchens that get through cloths quickly.',
      tr: 'Bezi hızlı tüketen mutfaklar için 20 yapraklı rulo.',
      ar: 'لفة من 20 ورقة للمطابخ التي تستهلك الأقمشة بسرعة.',
    },
  },
  {
    code: 'TM-050',
    name: { en: 'Cleaning Cloth, 3-Pack', tr: 'Temizlik Bezi 3’lü', ar: 'قماش تنظيف، 3 قطع' },
    desc: {
      en: 'The basic three-pack: absorbent, washable, and priced for volume.',
      tr: 'Temel 3’lü paket: emici, yıkanabilir ve toptan fiyatlı.',
      ar: 'العبوة الأساسية من 3 قطع: ماصة وقابلة للغسل وبسعر الجملة.',
    },
  },
  {
    code: 'TM-790',
    name: { en: 'Stainless Cleaning Cloth', tr: 'İnox Temizlik Bezi', ar: 'قماش تنظيف ستانلس' },
    desc: {
      en: 'Woven cloth made for stainless steel — polishes to a shine and leaves no smear.',
      tr: 'Paslanmaz çelik için üretilmiş dokuma bez; parlatır, leke bırakmaz.',
      ar: 'قماش منسوج مخصص للستانلس ستيل — يلمّع دون ترك آثار.',
    },
  },

  // ── Cleaning / Car care ────────────────────────────────────────────────────
  {
    code: 'TM-710',
    name: {
      en: 'Diamond-Weave Glass Cloth 50×70 cm, Carded',
      tr: 'Baklava Desenli Cam Bezi 50×70 cm Kartelalı',
      ar: 'قماش زجاج بنقشة معينية 50×70 سم، مع بطاقة',
    },
    desc: {
      en: 'Windscreen-sized diamond-weave cloth on a header card for forecourt display.',
      tr: 'Ön cam ölçüsünde, istasyon teşhiri için kartelalı baklava desenli bez.',
      ar: 'قماش بنقشة معينية بمقاس الزجاج الأمامي على بطاقة تعليق للعرض.',
    },
  },
  {
    code: 'TM-709',
    name: {
      en: 'Diamond-Weave Glass Cloth 50×70 cm',
      tr: 'Baklava Desenli Cam Bezi 50×70 cm',
      ar: 'قماش زجاج بنقشة معينية 50×70 سم',
    },
    desc: {
      en: 'Large diamond-weave cloth for windscreens and side glass, twenty to the pack.',
      tr: 'Ön ve yan camlar için büyük baklava desenli bez; 20’li pakette.',
      ar: 'قماش كبير بنقشة معينية للزجاج الأمامي والجانبي، 20 قطعة في العبوة.',
    },
  },
  {
    code: 'TM-706',
    name: {
      en: 'Microfibre Body Cloth 50×70 cm',
      tr: 'Mikrofiber Tank Bezi 50×70 cm',
      ar: 'قماش ألياف دقيقة لهيكل السيارة 50×70 سم',
    },
    desc: {
      en: 'Deep-pile microfibre that holds water and will not swirl paintwork.',
      tr: 'Suyu tutan ve boyada hâle bırakmayan yüksek havlı mikrofiber.',
      ar: 'ألياف دقيقة عالية الوبر تحتفظ بالماء ولا تخدش الطلاء.',
    },
  },
  {
    code: 'TM-700',
    name: {
      en: 'Car Drying Cloth 50×70 cm, Carded',
      tr: 'Oto Kurulama Bezi 50×70 cm Kartelalı',
      ar: 'قماش تجفيف السيارة 50×70 سم، مع بطاقة',
    },
    desc: {
      en: 'Absorbent drying cloth that takes a full car down without wringing.',
      tr: 'Bir aracı sıkmadan kurulayan emici kurulama bezi.',
      ar: 'قماش تجفيف ماص يجفف السيارة بالكامل دون عصر.',
    },
  },
  {
    code: 'TM-701',
    name: {
      en: 'Car Drying Cloth 50×70 cm, Rolled',
      tr: 'Oto Kurulama Bezi 50×70 cm Rulo',
      ar: 'قماش تجفيف السيارة 50×70 سم، ملفوف',
    },
    desc: {
      en: 'The same drying cloth rolled in a tube — stores damp without creasing.',
      tr: 'Aynı kurulama bezinin tüpte rulo hâli; nemliyken kırışmadan saklanır.',
      ar: 'نفس قماش التجفيف ملفوفًا في أنبوب — يُحفظ رطبًا دون تجعد.',
    },
  },
  {
    code: 'TM-653',
    name: { en: 'Car Drying Mitt', tr: 'Oto Kurulama Eldiveni', ar: 'قفاز تجفيف السيارة' },
    desc: {
      en: 'Plush mitt that keeps the hand behind the cloth over contours and trim.',
      tr: 'Eli bezin arkasında tutan, kavis ve bordürlerde çalışan peluş eldiven.',
      ar: 'قفاز وبري يبقي اليد خلف القماش عند المنحنيات والزوايا.',
    },
  },
  {
    code: 'TM-752',
    name: { en: 'Car Wash Sponge', tr: 'Oto Yıkama Süngeri', ar: 'إسفنجة غسيل السيارة' },
    desc: {
      en: 'Large open-cell sponge that carries plenty of foam and releases grit.',
      tr: 'Bol köpük taşıyan ve kumu bırakan büyük gözenekli sünger.',
      ar: 'إسفنجة كبيرة مسامية تحمل رغوة وفيرة وتتخلص من الحصى.',
    },
  },

  // ── Cleaning / Floor cleaning ──────────────────────────────────────────────
  {
    code: 'TM-087',
    name: {
      en: 'Micro Damp Mop 40 cm with Frame, Eco',
      tr: 'Mikro Nemli Mop 40 cm Aparatlı Eko',
      ar: 'ممسحة رطبة دقيقة 40 سم مع حامل، اقتصادية',
    },
    desc: {
      en: 'Entry-level 40 cm flat mop supplied with its frame, ready to fit a handle.',
      tr: 'Sapa takılmaya hazır, aparatıyla birlikte 40 cm giriş seviyesi palet mop.',
      ar: 'ممسحة مسطحة 40 سم اقتصادية تُورّد مع حاملها وجاهزة لتركيب العصا.',
    },
  },
  {
    code: 'TM-170',
    name: { en: 'Almond Mop', tr: 'Badem Mop', ar: 'ممسحة لوزية' },
    desc: {
      en: 'Almond-shaped head that reaches into corners a round mop leaves behind.',
      tr: 'Yuvarlak mopun ulaşamadığı köşelere giren badem formlu başlık.',
      ar: 'رأس بشكل لوزي يصل إلى الزوايا التي تتركها الممسحة الدائرية.',
    },
  },
  {
    code: 'TM-078',
    name: {
      en: 'Spin Head Towel Mop',
      tr: 'Döner Başlıklı Havlu Mop',
      ar: 'ممسحة منشفة برأس دوار',
    },
    desc: {
      en: 'Towel-pile head on a spin joint, so the mop lies flat at any angle.',
      tr: 'Döner mafsallı havlu başlık; mop her açıda yere yatık kalır.',
      ar: 'رأس بوبر منشفة على مفصل دوار تبقى الممسحة معه مستوية بأي زاوية.',
    },
  },
  {
    code: 'TM-175',
    name: {
      en: 'Spin Head Cord Mop, Deluxe',
      tr: 'Döner Başlıklı İpli Mop Lüx',
      ar: 'ممسحة خيطية برأس دوار، فاخرة',
    },
    desc: {
      en: 'Denser cord head on a spin joint for larger floors and wetter work.',
      tr: 'Geniş zeminler ve ıslak işler için döner mafsallı sık iplikli başlık.',
      ar: 'رأس خيطي أكثف على مفصل دوار للأرضيات الواسعة والأعمال الرطبة.',
    },
  },
  {
    code: 'TM-764',
    name: { en: 'Spin Head Cord Mop', tr: 'Döner Başlıklı İpli Mop', ar: 'ممسحة خيطية برأس دوار' },
    desc: {
      en: 'Standard cord mop head with a rotating joint, sold without the handle.',
      tr: 'Döner mafsallı standart iplikli mop başlığı; sapsız satılır.',
      ar: 'رأس ممسحة خيطية قياسي بمفصل دوار، يُباع بدون عصا.',
    },
  },
  {
    code: 'TM-664',
    name: {
      en: 'Microfibre Mop, Eco',
      tr: 'Mikrofiber Mop Eko',
      ar: 'ممسحة ألياف دقيقة، اقتصادية',
    },
    desc: {
      en: 'Value microfibre mop head that fits the standard bottle-thread handle.',
      tr: 'Standart vidalı sapa uyan ekonomik mikrofiber mop başlığı.',
      ar: 'رأس ممسحة ألياف دقيقة اقتصادي يناسب العصا القياسية.',
    },
  },
  {
    code: 'TM-432',
    name: {
      en: 'Welsoft Mop, Coloured, Carded, Eco',
      tr: 'Eko Welsoft Renkli Mop Kartelalı',
      ar: 'ممسحة ولسوفت ملونة، مع بطاقة، اقتصادية',
    },
    desc: {
      en: 'Coloured welsoft head on a header card, priced for high-street retail.',
      tr: 'Perakende rafına uygun fiyatlı, kartelalı renkli welsoft başlık.',
      ar: 'رأس ولسوفت ملون على بطاقة تعليق بسعر مناسب لتجارة التجزئة.',
    },
  },
  {
    code: 'TM-662',
    name: {
      en: 'Welsoft Striped Mop, Eco',
      tr: 'Eko Welsoft Çizgili Mop',
      ar: 'ممسحة ولسوفت مخططة، اقتصادية',
    },
    desc: {
      en: 'Striped welsoft pile that absorbs quickly and wrings out almost dry.',
      tr: 'Hızlı emen ve neredeyse kuru sıkılan çizgili welsoft hav.',
      ar: 'وبر ولسوفت مخطط يمتص بسرعة ويُعصر حتى يكاد يجف.',
    },
  },
  {
    code: 'TM-155',
    name: { en: 'Wide Frame Mop', tr: 'Geniş Aparatlı Mop', ar: 'ممسحة بحامل عريض' },
    desc: {
      en: 'Extra-wide frame that covers more floor per pass in halls and corridors.',
      tr: 'Salon ve koridorlarda tek geçişte daha çok alan süpüren ekstra geniş aparat.',
      ar: 'حامل عريض جدًا يغطي مساحة أكبر بكل تمريرة في الصالات والممرات.',
    },
  },
  {
    code: 'TM-145',
    name: { en: 'Gold Cord Mop', tr: 'Gold İpli Mop', ar: 'ممسحة خيطية جولد' },
    desc: {
      en: 'Twisted cotton-blend cord head, the traditional wet mop for hard floors.',
      tr: 'Sert zeminler için geleneksel ıslak mop: burgulu pamuk karışımı iplik başlık.',
      ar: 'رأس خيطي من مزيج قطني مجدول، الممسحة الرطبة التقليدية للأرضيات الصلبة.',
    },
  },
  {
    code: 'TM-148',
    name: { en: 'Jumbo Cord Mop', tr: 'Jumbo İpli Mop', ar: 'ممسحة خيطية جامبو' },
    desc: {
      en: 'Heavier cord head with more yarn for warehouses and large wet areas.',
      tr: 'Depo ve geniş ıslak alanlar için daha çok iplikli ağır başlık.',
      ar: 'رأس خيطي أثقل بخيوط أكثر للمستودعات والمساحات الرطبة الكبيرة.',
    },
  },
  {
    code: 'TM-482',
    option: SIZE,
    name: { en: 'Strip Mop', tr: 'Makarna Mop', ar: 'ممسحة شرائحية' },
    desc: {
      en: 'Looped strip head in 40, 50 and 60 cm widths for commercial floor work.',
      tr: 'Ticari zemin temizliği için 40, 50 ve 60 cm genişliklerde halkalı şerit başlık.',
      ar: 'رأس بشرائح حلقية بعرض 40 و50 و60 سم لتنظيف الأرضيات التجارية.',
    },
  },
  {
    code: 'TM-680',
    name: {
      en: 'Clamp Mop Set, No Handle',
      tr: 'Mandallı Mop Seti (Sapsız)',
      ar: 'طقم ممسحة بمشبك، بدون عصا',
    },
    desc: {
      en: 'Clamp plate and refill together — squeeze the lever and the pad releases.',
      tr: 'Mandal tabla ve yedek bir arada; kola basıldığında ped serbest kalır.',
      ar: 'قاعدة بمشبك مع رأس بديل — اضغط الذراع لتحرير القطعة.',
    },
  },
  {
    code: 'TM-250',
    name: {
      en: 'Clamp Mop Refill, 2-Pack',
      tr: 'Mandallı Mop Yedeği 2’li',
      ar: 'رأس بديل لممسحة المشبك، قطعتان',
    },
    desc: {
      en: 'Replacement pads for the clamp mop, machine washable and colour-fast.',
      tr: 'Mandallı mop için makinede yıkanabilir, rengi solmayan yedek pedler.',
      ar: 'قطع بديلة لممسحة المشبك، قابلة للغسل بالغسالة وثابتة اللون.',
    },
  },
  {
    code: 'TM-088',
    option: SIZE,
    name: {
      en: 'Micro Damp Mop with Frame',
      tr: 'Mikro Nemli Mop Aparatlı',
      ar: 'ممسحة رطبة دقيقة مع حامل',
    },
    desc: {
      en: 'Flat mop and frame together in 40, 50 and 60 cm, ready to fit a handle.',
      tr: '40, 50 ve 60 cm’de sapa takılmaya hazır palet mop ve aparat seti.',
      ar: 'ممسحة مسطحة مع حاملها بمقاسات 40 و50 و60 سم وجاهزة لتركيب العصا.',
    },
  },
  {
    code: 'TM-084',
    option: SIZE,
    name: { en: 'Micro Damp Mop Refill', tr: 'Mikro Nemli Mop Yedeği', ar: 'رأس ممسحة رطبة دقيقة' },
    desc: {
      en: 'Damp-mop pads from 25 to 80 cm, packed 25 to the pack for contract cleaners.',
      tr: 'Taahhüt temizliği için 25’li paketlerde 25–80 cm nemli mop pedleri.',
      ar: 'قطع ممسحة رطبة من 25 إلى 80 سم، 25 قطعة في العبوة لشركات التنظيف.',
    },
  },
  {
    code: 'TM-778',
    name: {
      en: 'Microfibre Spin Mop Set, 3-Piece',
      tr: 'Mikrofiber 3’lü Sapset',
      ar: 'طقم ممسحة دوارة من الألياف الدقيقة، 3 قطع',
    },
    desc: {
      en: 'Telescopic handle, spin head and microfibre pad — a complete mop in one pack.',
      tr: 'Teleskopik sap, döner başlık ve mikrofiber ped; tek pakette tam mop.',
      ar: 'عصا تلسكوبية ورأس دوار وقطعة ألياف دقيقة — ممسحة كاملة في عبوة واحدة.',
    },
  },
  {
    code: 'TM-665',
    name: {
      en: 'Microfibre Mop, Deluxe',
      tr: 'Mikrofiber Mop Lüx',
      ar: 'ممسحة ألياف دقيقة، فاخرة',
    },
    desc: {
      en: 'Long-pile microfibre head that traps fine dust as well as it mops wet.',
      tr: 'Islak paspaslama kadar ince tozu da tutan uzun havlı mikrofiber başlık.',
      ar: 'رأس ألياف دقيقة طويل الوبر يحبس الغبار الناعم كما ينظف رطبًا.',
    },
  },
  {
    code: 'TM-435',
    name: { en: 'Microfibre Mop', tr: 'Mikrofiber Mop', ar: 'ممسحة ألياف دقيقة' },
    desc: {
      en: 'Standard microfibre mop head in assorted colours, bottle-thread fitting.',
      tr: 'Karışık renklerde, vidalı geçmeli standart mikrofiber mop başlığı.',
      ar: 'رأس ممسحة ألياف دقيقة قياسي بألوان متنوعة بتركيب لولبي.',
    },
  },
  {
    code: 'TM-550',
    option: SIZE,
    name: { en: 'Plastic Flat Mop Frame', tr: 'Plastik Palet Aparat', ar: 'حامل ممسحة بلاستيكي' },
    desc: {
      en: 'Velcro-faced frame with a jointed handle socket, from 25 to 80 cm.',
      tr: '25–80 cm arası, mafsallı sap yuvalı cırt cırtlı palet aparat.',
      ar: 'حامل بوجه لاصق ومقبس عصا مفصلي، من 25 إلى 80 سم.',
    },
  },
  {
    code: 'TM-471',
    name: { en: 'Spray Mop Refill', tr: 'Sprey Mop Yedeği', ar: 'رأس بديل لممسحة الرذاذ' },
    desc: {
      en: 'Replacement microfibre pad for spray mops, washable and reusable.',
      tr: 'Sprey moplar için yıkanabilir, tekrar kullanılabilir mikrofiber yedek ped.',
      ar: 'قطعة ألياف دقيقة بديلة لمماسح الرذاذ، قابلة للغسل وإعادة الاستخدام.',
    },
  },
  {
    code: 'TM-470',
    name: { en: 'Tablet Mop Refill', tr: 'Tablet Mop Yedeği', ar: 'رأس بديل لممسحة التابلت' },
    desc: {
      en: 'Single replacement pad for tablet-style flat mops.',
      tr: 'Tablet tipi palet moplar için tekli yedek ped.',
      ar: 'قطعة بديلة مفردة لمماسح التابلت المسطحة.',
    },
  },
  {
    code: 'TM-165',
    name: {
      en: 'Floor Cloth 50×70 cm',
      tr: 'Paspas Yer Bezi 50×70 cm',
      ar: 'قماش أرضيات 50×70 سم',
    },
    desc: {
      en: 'Large absorbent floor cloth for spills, stairs and edges a mop cannot reach.',
      tr: 'Dökülmeler, merdiven ve mopun giremediği kenarlar için büyük emici yer bezi.',
      ar: 'قماش أرضيات كبير وماص للانسكابات والسلالم والحواف التي لا تصلها الممسحة.',
    },
  },
  {
    code: 'TM-076',
    name: {
      en: 'Welsoft Mop, Coloured, Carded',
      tr: 'Welsoft Renkli Mop Kartelalı',
      ar: 'ممسحة ولسوفت ملونة، مع بطاقة',
    },
    desc: {
      en: 'Super-absorbent welsoft head on a header card, in five shelf colours.',
      tr: 'Beş raf renginde, kartelalı süper emici welsoft başlık.',
      ar: 'رأس ولسوفت فائق الامتصاص على بطاقة تعليق بخمسة ألوان للعرض.',
    },
  },
  {
    code: 'TM-075',
    name: {
      en: 'Welsoft Mop, Coloured, Bagged',
      tr: 'Welsoft Renkli Mop Poşetli',
      ar: 'ممسحة ولسوفت ملونة، معبأة',
    },
    desc: {
      en: 'The same welsoft head bagged rather than carded, for lower-cost shipping.',
      tr: 'Aynı welsoft başlığın, daha ekonomik sevkiyat için poşetli hâli.',
      ar: 'نفس رأس الولسوفت معبأ في كيس بدل البطاقة لتقليل تكلفة الشحن.',
    },
  },
  {
    code: 'TM-430',
    name: {
      en: 'Welsoft Striped Mop, Carded',
      tr: 'Welsoft Çizgili Mop Kartelalı',
      ar: 'ممسحة ولسوفت مخططة، مع بطاقة',
    },
    desc: {
      en: 'Striped welsoft pile on a header card — holds water without dripping.',
      tr: 'Kartelalı çizgili welsoft hav; su tutar, damlatmaz.',
      ar: 'وبر ولسوفت مخطط على بطاقة تعليق — يحتفظ بالماء دون تنقيط.',
    },
  },
];
