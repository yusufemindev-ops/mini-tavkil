/**
 * The catalogue taxonomy — shared by every supplier, owned by none of them.
 *
 * This used to live inside the Temsan importer, which meant the categories were
 * created and destroyed by one supplier's import. With a second supplier that is
 * actively wrong: importing B would delete the categories A's products sit in.
 * The tree is a property of the marketplace, so it lives on its own and importers
 * only ever *attach* to it.
 *
 * Slugs carry no supplier name. `/catalogue/floor-cleaning` is a category any
 * supplier can sell into; `/catalogue/temsan-floor-cleaning` said the opposite,
 * and put a supplier's name in a public URL besides.
 *
 * Shape: one root with fourteen children. Roots are broad enough that a new
 * supplier usually lands under an existing one, and the interesting distinctions
 * live one level down where products actually differ. Expect more roots as the
 * catalogue widens — that is why `key` is stable and separate from the display
 * name, so a category can be renamed in three languages without moving its URL.
 */

export type Locale = 'en' | 'tr' | 'ar';
export type Tri = Record<Locale, string>;

export interface CategoryNode {
  /** Stable identity. Never rendered; safe to keep when a name changes. */
  key: string;
  /** Parent key. Absent for a root. */
  parent?: string;
  /** lucide-react icon name for the storefront category rail. */
  icon: string;
  name: Tri;
  desc: Tri;
}

export const CATEGORIES: CategoryNode[] = [
  {
    key: 'household-hardware',
    icon: 'Home',
    name: {
      en: 'Household & Hardware',
      tr: 'Ev ve Hırdavat',
      ar: 'المنزل والأدوات',
    },
    desc: {
      en: 'Cleaning supplies, mops, sponges, rope and hardware made in Türkiye for wholesale and export.',
      tr: 'Toptan ve ihracat için Türkiye’de üretilen temizlik ürünleri, mop, sünger, ip ve hırdavat.',
      ar: 'مستلزمات تنظيف ومماسح وإسفنج وحبال وأدوات، صناعة تركية للبيع بالجملة والتصدير.',
    },
  },

  {
    key: 'floor-cleaning',
    parent: 'household-hardware',
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
    parent: 'household-hardware',
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
    parent: 'household-hardware',
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
    parent: 'household-hardware',
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
    parent: 'household-hardware',
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
    parent: 'household-hardware',
    icon: 'ShowerHead',
    name: { en: 'Bath', tr: 'Banyo', ar: 'الحمام' },
    desc: {
      en: 'Bath puffs and sponges in retail-ready display packs.',
      tr: 'Perakendeye hazır standlı kolilerde banyo lifi ve süngerleri.',
      ar: 'ليف وإسفنج استحمام في عبوات عرض جاهزة للبيع بالتجزئة.',
    },
  },
  {
    key: 'clotheslines',
    parent: 'household-hardware',
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
    parent: 'household-hardware',
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
    parent: 'household-hardware',
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
    parent: 'household-hardware',
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
    parent: 'household-hardware',
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
    parent: 'household-hardware',
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
    parent: 'household-hardware',
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
    parent: 'household-hardware',
    icon: 'Brush',
    name: { en: 'Plaster Sponges', tr: 'Sıva Süngerleri', ar: 'إسفنج المحارة' },
    desc: {
      en: 'Dense sponges for floating plaster, render and tile grout.',
      tr: 'Sıva, şap ve derz uygulamaları için yoğun dokulu süngerler.',
      ar: 'إسفنج عالي الكثافة لتسوية المحارة والقصارة وحشو البلاط.',
    },
  },
];
