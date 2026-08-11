/**
 * Product attributes, read out of the supplier's own product names.
 *
 * Temsan's Turkish names are not prose — they are a spec sheet written as a
 * string. "MİKROFİBER BEZ 4'LÜ {OVERLOKLU} EVİMA {12'Lİ} {30*30 CM}" states the
 * material, the pack count, the edge finish and the size. All of it was imported
 * as a name and none of it as data, so 82 specification tables showed four
 * logistics rows and nothing about the product itself.
 *
 * Everything here is extracted, never invented: if the name does not say it, the
 * attribute is absent. A wrong specification on a wholesale listing is worse than
 * a missing one, because a buyer orders against it.
 *
 * Values are localised because `product_attributes` is per-locale — a Turkish
 * buyer should read "Mikrofiber", not "Microfibre".
 */

import type { Locale, Tri } from '../catalogue-tree';

export interface AttributeRule {
  /** Matched against the supplier's Turkish name, case-insensitively. */
  match: RegExp;
  label: Tri;
  value: Tri;
}

const LABEL = {
  material: { en: 'Material', tr: 'Malzeme', ar: 'الخامة' },
  weave: { en: 'Weave', tr: 'Doku', ar: 'النسيج' },
  edge: { en: 'Edge finish', tr: 'Kenar', ar: 'حافة' },
  pack: { en: 'Pack contents', tr: 'Paket içeriği', ar: 'محتوى العبوة' },
  presentation: { en: 'Presentation', tr: 'Sunum', ar: 'طريقة العرض' },
  grade: { en: 'Grade', tr: 'Sınıf', ar: 'الفئة' },
} satisfies Record<string, Tri>;

/**
 * Order matters only for `sortOrder`; every rule that matches is applied.
 * Material first because it is what a buyer filters on.
 */
export const RULES: AttributeRule[] = [
  // ── Material ───────────────────────────────────────────────────────────────
  {
    match: /M[İI]KROF[İI]BER/i,
    label: LABEL.material,
    value: { en: 'Microfibre', tr: 'Mikrofiber', ar: 'ألياف دقيقة' },
  },
  {
    match: /WELSOFT/i,
    label: LABEL.material,
    value: { en: 'Welsoft', tr: 'Welsoft', ar: 'ولسوفت' },
  },
  {
    match: /PELU[ŞS]/i,
    label: LABEL.material,
    value: { en: 'Plush', tr: 'Peluş', ar: 'وبر' },
  },
  {
    match: /J[ÜU]T/i,
    label: LABEL.material,
    value: { en: 'Jute', tr: 'Jüt', ar: 'جوت' },
  },
  {
    match: /NAYLON/i,
    label: LABEL.material,
    value: { en: 'Nylon', tr: 'Naylon', ar: 'نايلون' },
  },
  {
    match: /POLYESTER/i,
    label: LABEL.material,
    value: { en: 'Polyester', tr: 'Polyester', ar: 'بوليستر' },
  },
  {
    // "PVC KAPLI ÇELİK" — the steel is the core, the PVC is the jacket.
    match: /PVC KAPLI [ÇC]EL[İI]K/i,
    label: LABEL.material,
    value: {
      en: 'PVC-coated steel',
      tr: 'PVC kaplı çelik',
      ar: 'فولاذ مغلف بالـPVC',
    },
  },
  {
    match: /[İI]ZOLEL[İI] [ÇC]EL[İI]K/i,
    label: LABEL.material,
    value: {
      en: 'PVC-insulated steel',
      tr: 'PVC izoleli çelik',
      ar: 'فولاذ معزول بالـPVC',
    },
  },
  {
    match: /[İI]NOX/i,
    label: LABEL.material,
    value: { en: 'Stainless steel', tr: 'İnox (paslanmaz)', ar: 'ستانلس ستيل' },
  },
  {
    match: /S[ÜU]NGER/i,
    label: LABEL.material,
    value: { en: 'Foam sponge', tr: 'Sünger', ar: 'إسفنج' },
  },

  // ── Weave / pattern ────────────────────────────────────────────────────────
  {
    match: /BAKLAVA DESENL[İI]/i,
    label: LABEL.weave,
    value: { en: 'Diamond weave', tr: 'Baklava desenli', ar: 'نقشة معينية' },
  },
  {
    match: /LACOST/i,
    label: LABEL.weave,
    value: { en: 'Piqué', tr: 'Lacost', ar: 'بيكيه' },
  },
  {
    match: /KAREL[İI]/i,
    label: LABEL.weave,
    value: { en: 'Checked', tr: 'Kareli', ar: 'مربعات' },
  },
  {
    match: /[ÇC][İI]ZG[İI]L[İI]/i,
    label: LABEL.weave,
    value: { en: 'Striped', tr: 'Çizgili', ar: 'مخطط' },
  },
  {
    match: /OLUKLU/i,
    label: LABEL.weave,
    value: { en: 'Grooved', tr: 'Oluklu', ar: 'مخدد' },
  },
  {
    match: /F[İI]LEL[İI]/i,
    label: LABEL.weave,
    value: { en: 'Mesh-wrapped', tr: 'Fileli', ar: 'مغلف بشبكة' },
  },

  // ── Edge finish ────────────────────────────────────────────────────────────
  {
    match: /OVERLOKLU/i,
    label: LABEL.edge,
    value: { en: 'Overlocked', tr: 'Overloklu', ar: 'حواف مخيطة' },
  },
  {
    match: /ULTRASON[İI]K/i,
    label: LABEL.edge,
    value: { en: 'Ultrasonic cut', tr: 'Ultrasonik kesim', ar: 'قص فوق صوتي' },
  },

  // ── Presentation ───────────────────────────────────────────────────────────
  {
    match: /STANTLI KOL[İI]L[İI]/i,
    label: LABEL.presentation,
    value: { en: 'Counter display box', tr: 'Standlı koli', ar: 'صندوق عرض' },
  },
  {
    match: /KARTELALI/i,
    label: LABEL.presentation,
    value: { en: 'Header card', tr: 'Kartelalı', ar: 'بطاقة تعليق' },
  },
  {
    match: /PO[ŞS]ETL[İI]/i,
    label: LABEL.presentation,
    value: { en: 'Bagged', tr: 'Poşetli', ar: 'معبأ في كيس' },
  },
  {
    match: /D[ÖO]KME/i,
    label: LABEL.presentation,
    value: { en: 'Bulk', tr: 'Dökme', ar: 'سائب' },
  },
  {
    match: /RULO/i,
    label: LABEL.presentation,
    value: { en: 'Roll', tr: 'Rulo', ar: 'لفة' },
  },

  {
    match: /PLAST[İI]K/i,
    label: LABEL.material,
    value: { en: 'Plastic', tr: 'Plastik', ar: 'بلاستيك' },
  },

  // ── Mop head type. The word for the head is the product distinction here. ──
  {
    match: /M[İI]KRO NEML[İI]/i,
    label: LABEL.weave,
    value: { en: 'Damp flat pad', tr: 'Mikro nemli', ar: 'قطعة مسطحة رطبة' },
  },
  {
    match: /MAKARNA/i,
    label: LABEL.weave,
    value: { en: 'Looped strip', tr: 'Makarna', ar: 'شرائح حلقية' },
  },
  {
    match: /[İI]PL[İI]/i,
    label: LABEL.weave,
    value: { en: 'Corded', tr: 'İpli', ar: 'خيطي' },
  },
  {
    match: /HAVLU/i,
    label: LABEL.weave,
    value: { en: 'Towel pile', tr: 'Havlu', ar: 'وبر منشفة' },
  },
  {
    match: /D[ÖO]NER BA[ŞS]LIKLI/i,
    label: LABEL.edge,
    value: { en: 'Spin head', tr: 'Döner başlıklı', ar: 'رأس دوار' },
  },
  {
    match: /MANDALLI/i,
    label: LABEL.edge,
    value: { en: 'Clamp plate', tr: 'Mandallı', ar: 'قاعدة بمشبك' },
  },

  // ── Grade ──────────────────────────────────────────────────────────────────
  {
    match: /\bEKO\b/i,
    label: LABEL.grade,
    value: { en: 'Economy', tr: 'Eko', ar: 'اقتصادي' },
  },
  {
    match: /\bL[ÜU]X\b/i,
    label: LABEL.grade,
    value: { en: 'Deluxe', tr: 'Lüx', ar: 'فاخر' },
  },
  {
    match: /PREM[İI]UM/i,
    label: LABEL.grade,
    value: { en: 'Premium', tr: 'Premium', ar: 'ممتاز' },
  },
];

/**
 * Pack count, e.g. "4'LÜ", "{20'Lİ}", "3'LU", "(24'LÜ)", "2'Lİ".
 *
 * Turkish suffixes vary with vowel harmony and the apostrophe is sometimes a
 * straight quote and sometimes a typographic one, so the shapes are matched
 * rather than listed.
 */
export function packCount(name: string): number | null {
  // No trailing \b: JavaScript word boundaries are ASCII-only, so "20'Lİ)" has
  // no boundary after the dotted İ and the match silently failed on every
  // Turkish-suffixed count. The apostrophe is optional because the sheet also
  // writes "9 LU" plainly.
  const match = name.match(/(\d+)\s*['’]?\s*L[İIÜU]|(\d+)\s*['’]?\s*LU(?![A-Za-zÇĞİÖŞÜ])/i);
  if (!match) return null;
  return Number(match[1] ?? match[2]);
}

/** Net weight sold by mass, e.g. "2 KG'LIK", "500 GR'LIK". */
export function netWeight(name: string): string | null {
  const kg = name.match(/(\d+(?:[.,]\d+)?)\s*KG\s*['’]?\s*LIK/i);
  if (kg) return `${kg[1].replace(',', '.')} kg`;
  const gr = name.match(/(\d+)\s*GR\s*['’]?\s*LIK/i);
  return gr ? `${gr[1]} g` : null;
}

/** A length stated in the name, e.g. "20 MT", "10 MT". */
export function length(name: string): string | null {
  const m = name.match(/(\d+)\s*MT\b/i);
  return m ? `${m[1]} m` : null;
}

/** Dimensions, e.g. "40*40 CM", "50*70 CM", "30*40 CM". */
export function dimensions(name: string): string | null {
  const match = name.match(/(\d+)\s*\*\s*(\d+)\s*CM/i);
  return match ? `${match[1]} × ${match[2]} cm` : null;
}

export const PACK_LABEL: Tri = LABEL.pack;
export const DIMENSION_LABEL: Tri = {
  en: 'Dimensions',
  tr: 'Ebat',
  ar: 'الأبعاد',
};

/** Every attribute a name yields, in a stable order, for one locale. */
export function attributesFor(
  turkishName: string,
  locale: Locale,
): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = [];

  for (const rule of RULES) {
    if (rule.match.test(turkishName)) {
      // A name can state two materials ("PVC KAPLI ÇELİK" also matches ÇELİK);
      // the first rule to claim a label wins, since rules run most-specific first.
      if (out.some((a) => a.name === rule.label[locale])) continue;
      out.push({ name: rule.label[locale], value: rule.value[locale] });
    }
  }

  const weight = netWeight(turkishName);
  if (weight) {
    out.push({
      name: { en: 'Net weight', tr: 'Net ağırlık', ar: 'الوزن الصافي' }[locale],
      value: weight,
    });
  }

  const run = length(turkishName);
  if (run) {
    out.push({
      name: { en: 'Length', tr: 'Uzunluk', ar: 'الطول' }[locale],
      value: run,
    });
  }

  const size = dimensions(turkishName);
  if (size) out.push({ name: DIMENSION_LABEL[locale], value: size });

  const pack = packCount(turkishName);
  if (pack) {
    out.push({
      name: PACK_LABEL[locale],
      value: locale === 'en' ? `${pack} pieces` : locale === 'tr' ? `${pack} adet` : `${pack} قطعة`,
    });
  }

  return out;
}
