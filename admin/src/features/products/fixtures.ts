// Mock data for the admin Products screens. Served by MSW (see
// src/mocks/handlers.ts) only when VITE_API_MOCKING=enabled; with the flag off
// the worker never starts and requests fall through to the real backend.
// Shapes mirror AdminProduct + nested DTOs from ./queries.
//
// NOTE: basePrice here is the admin-only field — fine in this admin fixture, but
// it must never leak to public/buyer code (pricing-visibility rule).

import type {
  AdminProduct,
  AdminProductAttribute,
  AdminProductImage,
  AdminProductTranslation,
} from './queries';

// Mock-only: the fake tavkil.com URLs don't resolve, so render a seeded
// placeholder (deterministic by id) instead of a broken image.
function img(id: string, _url: string, alt: string, isPrimary: boolean): AdminProductImage {
  return {
    id,
    url: `https://picsum.photos/seed/${id}/200/200`,
    // Alt is per-locale on the wire; fixtures only ever need English.
    alt: { en: alt },
    isPrimary,
    sortOrder: isPrimary ? 0 : 1,
  };
}

function attr(name: string, value: string, sortOrder: number): AdminProductAttribute {
  return { locale: 'en', name, value, sortOrder };
}

// English translation builder — always complete.
function en(name: string, slug: string, description: string): AdminProductTranslation {
  return {
    locale: 'en',
    name,
    slug,
    description,
    specsMd: null,
    seoTitle: null,
    seoDescription: null,
    isComplete: true,
    isMachineTranslated: false,
  };
}

// `complete` is the single source of truth: an incomplete translation has NO
// name/slug, so the stored `isComplete` flag can never disagree with a live
// recompute (name && slug) — which is exactly what the edit-page publish gate
// does. This keeps the list badges and the gate consistent.
function tr(name: string, slug: string, complete: boolean): AdminProductTranslation {
  return {
    locale: 'tr',
    name: complete ? name : '',
    slug: complete ? slug : '',
    description: null,
    specsMd: null,
    seoTitle: null,
    seoDescription: null,
    isComplete: complete,
    isMachineTranslated: false,
  };
}

function ar(name: string, slug: string, complete: boolean): AdminProductTranslation {
  return {
    locale: 'ar',
    name: complete ? name : '',
    slug: complete ? slug : '',
    description: null,
    specsMd: null,
    seoTitle: null,
    seoDescription: null,
    isComplete: complete,
    isMachineTranslated: complete,
  };
}

// Mock products predate weight/cbm/options — inject empty defaults so each
// literal still satisfies AdminProduct without editing all of them.
const BASE_PRODUCTS: AdminProduct[] = (
  [
    {
      id: 'prod-bt70',
      supplier: { id: 'sup-denizli', name: 'Denizli Tekstil' },
      category: { id: 'cat-bath-towels', name: 'Bath Towels' },
      sku: 'DT-BT70',
      moq: 200,
      boxQuantity: 20,
      weightKg: 0.42,
      cbm: 0.003,
      unit: 'piece',
      hsCode: '6302.60',
      brandName: 'Denizli Home',
      countryOfOrigin: 'TR',
      gtin13: '8690000000017',
      mpn: 'BT70-140',
      options: [
        {
          id: 'opt-bt70-color',
          name: 'Color',
          type: 'swatch',
          isVisible: true,
          sortOrder: 0,
          values: [
            {
              id: 'v-bt70-white',
              label: 'White',
              imageUrl: null,
              colorHex: '#f4f4f5',
              sortOrder: 0,
            },
            { id: 'v-bt70-navy', label: 'Navy', imageUrl: null, colorHex: '#1e3a5f', sortOrder: 1 },
            { id: 'v-bt70-sage', label: 'Sage', imageUrl: null, colorHex: '#9caf88', sortOrder: 2 },
          ],
        },
        {
          id: 'opt-bt70-size',
          name: 'Size',
          type: 'chip',
          isVisible: true,
          sortOrder: 1,
          values: [
            { id: 'v-bt70-s', label: '50x90cm', imageUrl: null, colorHex: null, sortOrder: 0 },
            { id: 'v-bt70-l', label: '70x140cm', imageUrl: null, colorHex: null, sortOrder: 1 },
          ],
        },
      ],
      basePrice: {
        amount: 5.85,
        currency: 'USD',
        updatedAt: '2026-05-20T11:30:00.000Z',
        updatedBy: 'u-mock-admin',
      },
      status: 'published',
      sortOrder: 1,
      createdAt: '2026-01-20T09:00:00.000Z',
      updatedAt: '2026-05-20T11:30:00.000Z',
      translations: [
        en(
          'Cotton Bath Towel 70x140cm',
          'cotton-bath-towel-70x140',
          'Soft 500 GSM cotton bath towel.',
        ),
        tr('Pamuklu Banyo Havlusu 70x140cm', 'pamuklu-banyo-havlusu-70x140', true),
        ar('منشفة حمام قطنية 70x140 سم', 'minshafat-hammam-70x140', true),
      ],
      attributes: [attr('Material', '100% Cotton', 0), attr('Weight', '500 GSM', 1)],
      images: [
        img(
          'img-bt70-1',
          'https://images.tavkil.com/products/bt70-1.jpg',
          'Cotton bath towel',
          true,
        ),
        img(
          'img-bt70-2',
          'https://images.tavkil.com/products/bt70-2.jpg',
          'Folded towel stack',
          false,
        ),
      ],
    },
    {
      id: 'prod-wh40',
      supplier: { id: 'sup-denizli', name: 'Denizli Tekstil' },
      category: { id: 'cat-hand-towels', name: 'Hand Towels' },
      sku: 'DT-WH40',
      moq: 240,
      boxQuantity: 24,
      unit: 'piece',
      hsCode: '6302.60',
      brandName: 'Denizli Home',
      countryOfOrigin: 'TR',
      gtin13: '8690000000024',
      mpn: 'WH40-60',
      basePrice: {
        amount: 2.4,
        currency: 'USD',
        updatedAt: '2026-05-20T11:32:00.000Z',
        updatedBy: 'u-mock-admin',
      },
      status: 'published',
      sortOrder: 2,
      createdAt: '2026-01-20T09:05:00.000Z',
      updatedAt: '2026-05-20T11:32:00.000Z',
      translations: [
        en(
          'Waffle Hand Towel 40x60cm',
          'waffle-hand-towel-40x60',
          'Lightweight waffle-weave hand towel.',
        ),
        tr('Vafel El Havlusu 40x60cm', 'vafel-el-havlusu-40x60', true),
        ar('منشفة يد وافل 40x60 سم', 'minshafat-yad-waffle-40x60', false),
      ],
      attributes: [attr('Material', '100% Cotton', 0)],
      images: [
        img(
          'img-wh40-1',
          'https://images.tavkil.com/products/wh40-1.jpg',
          'Waffle hand towel',
          true,
        ),
      ],
    },
    {
      id: 'prod-br90',
      supplier: { id: 'sup-denizli', name: 'Denizli Tekstil' },
      category: { id: 'cat-bath-towels', name: 'Bath Towels' },
      sku: 'DT-BR90',
      moq: 100,
      boxQuantity: 10,
      unit: 'piece',
      hsCode: '6208.91',
      brandName: 'Denizli Home',
      countryOfOrigin: 'TR',
      gtin13: null,
      mpn: null,
      basePrice: {
        amount: 14.5,
        currency: 'USD',
        updatedAt: '2026-05-21T10:00:00.000Z',
        updatedBy: 'u-mock-admin',
      },
      status: 'draft',
      sortOrder: 3,
      createdAt: '2026-02-02T09:00:00.000Z',
      updatedAt: '2026-05-21T10:00:00.000Z',
      translations: [
        en(
          'Cotton Bathrobe (Unisex)',
          'cotton-bathrobe-unisex',
          'Terry cotton bathrobe, one-size unisex.',
        ),
        tr('Pamuklu Bornoz (Unisex)', 'pamuklu-bornoz-unisex', false),
        ar('روب حمام قطني', 'rub-hammam-qutni', false),
      ],
      attributes: [attr('Size', 'One size', 0)],
      images: [],
    },
    {
      id: 'prod-lp36',
      supplier: { id: 'sup-levantine', name: 'Levantine Lighting' },
      category: { id: 'cat-led-panels', name: 'LED Panels' },
      sku: 'LL-LP36',
      moq: 40,
      boxQuantity: 4,
      weightKg: 2.8,
      cbm: 0.012,
      unit: 'piece',
      hsCode: '9405.40',
      brandName: 'Levantine',
      countryOfOrigin: 'TR',
      gtin13: '8690000000116',
      mpn: 'LP600-36W',
      options: [
        {
          id: 'opt-lp36-cct',
          name: 'Colour temperature',
          type: 'chip',
          isVisible: true,
          sortOrder: 0,
          values: [
            {
              id: 'v-lp36-3000',
              label: '3000K Warm',
              imageUrl: null,
              colorHex: null,
              sortOrder: 0,
            },
            {
              id: 'v-lp36-4000',
              label: '4000K Neutral',
              imageUrl: null,
              colorHex: null,
              sortOrder: 1,
            },
            {
              id: 'v-lp36-6500',
              label: '6500K Cool',
              imageUrl: null,
              colorHex: null,
              sortOrder: 2,
            },
          ],
        },
        {
          id: 'opt-lp36-frame',
          name: 'Frame finish (internal)',
          type: 'swatch',
          isVisible: false,
          sortOrder: 1,
          values: [
            {
              id: 'v-lp36-white',
              label: 'White',
              imageUrl: null,
              colorHex: '#f4f4f5',
              sortOrder: 0,
            },
            {
              id: 'v-lp36-silver',
              label: 'Silver',
              imageUrl: null,
              colorHex: '#c0c0c0',
              sortOrder: 1,
            },
          ],
        },
      ],
      basePrice: {
        amount: 19.5,
        currency: 'USD',
        updatedAt: '2026-05-22T08:15:00.000Z',
        updatedBy: 'u-mock-admin',
      },
      status: 'published',
      sortOrder: 4,
      createdAt: '2026-01-25T09:00:00.000Z',
      updatedAt: '2026-05-22T08:15:00.000Z',
      translations: [
        en(
          'LED Panel 600x600 36W',
          'led-panel-600x600-36w',
          'Recessed 36W LED panel, 4000K neutral white.',
        ),
        tr('LED Panel 600x600 36W', 'led-panel-600x600-36w-tr', true),
        ar('لوحة LED 600x600 36 واط', 'lawhat-led-600x600-36w', true),
      ],
      attributes: [attr('Power', '36W', 0), attr('Colour temperature', '4000K', 1)],
      images: [
        img('img-lp36-1', 'https://images.tavkil.com/products/lp36-1.jpg', 'LED panel', true),
      ],
    },
    {
      id: 'prod-df1',
      supplier: { id: 'sup-levantine', name: 'Levantine Lighting' },
      category: { id: 'cat-decorative-fixtures', name: 'Decorative Fixtures' },
      sku: 'LL-DF1',
      moq: 10,
      boxQuantity: 2,
      unit: 'piece',
      hsCode: '9405.10',
      brandName: 'Levantine',
      countryOfOrigin: 'TR',
      gtin13: null,
      mpn: 'BS-100',
      basePrice: {
        amount: 155.0,
        currency: 'USD',
        updatedAt: '2026-05-22T08:20:00.000Z',
        updatedBy: 'u-mock-admin',
      },
      status: 'published',
      sortOrder: 5,
      createdAt: '2026-01-26T09:00:00.000Z',
      updatedAt: '2026-05-22T08:20:00.000Z',
      translations: [
        en(
          'Brass Wall Sconce',
          'brass-wall-sconce',
          'Decorative brass wall sconce for hospitality interiors.',
        ),
        tr('Pirinç Duvar Aplik', 'pirinc-duvar-aplik', false),
        ar('إضاءة جدارية نحاسية', 'idaa-jidariyya-nuhasiyya', false),
      ],
      attributes: [attr('Finish', 'Antique brass', 0)],
      images: [
        img('img-df1-1', 'https://images.tavkil.com/products/df1-1.jpg', 'Brass sconce', true),
      ],
    },
    {
      id: 'prod-ct2',
      supplier: { id: 'sup-levantine', name: 'Levantine Lighting' },
      category: { id: 'cat-commercial-lighting', name: 'Commercial Lighting' },
      sku: 'LL-CT2',
      moq: 20,
      boxQuantity: 5,
      unit: 'piece',
      hsCode: '7326.90',
      brandName: 'Levantine',
      countryOfOrigin: 'TR',
      gtin13: null,
      mpn: 'CT-2000',
      basePrice: {
        amount: 12.0,
        currency: 'USD',
        updatedAt: '2026-05-22T08:25:00.000Z',
        updatedBy: 'u-mock-admin',
      },
      status: 'archived',
      sortOrder: 6,
      createdAt: '2026-01-27T09:00:00.000Z',
      updatedAt: '2026-04-30T08:25:00.000Z',
      translations: [
        en('Cable Tray 2m', 'cable-tray-2m', 'Galvanised steel cable tray, 2 metre length.'),
        tr('Kablo Kanalı 2m', 'kablo-kanali-2m', true),
        ar('حامل كابلات 2 متر', 'hamil-kablat-2m', false),
      ],
      attributes: [attr('Length', '2 m', 0)],
      images: [],
    },
    {
      id: 'prod-hp5',
      supplier: { id: 'sup-aydin', name: 'Aydın Industrial' },
      category: { id: 'cat-pumps', name: 'Pumps' },
      sku: 'AY-HP5',
      moq: 4,
      boxQuantity: 1,
      unit: 'piece',
      hsCode: '8413.70',
      brandName: 'Aydın',
      countryOfOrigin: 'TR',
      gtin13: null,
      mpn: 'HP-5HP',
      basePrice: {
        amount: 348.0,
        currency: 'USD',
        updatedAt: '2026-05-26T16:20:00.000Z',
        updatedBy: 'u-mock-admin',
      },
      status: 'draft',
      sortOrder: 7,
      createdAt: '2026-02-06T09:00:00.000Z',
      updatedAt: '2026-05-26T16:20:00.000Z',
      translations: [
        en('Hydraulic Pump 5HP', 'hydraulic-pump-5hp', 'Centrifugal hydraulic pump, 5 horsepower.'),
        tr('Hidrolik Pompa 5HP', 'hidrolik-pompa-5hp', false),
        ar('مضخة هيدروليكية 5 حصان', 'mudakhkha-hidruliyya-5hp', false),
      ],
      attributes: [attr('Power', '5 HP', 0)],
      images: [],
    },
    {
      id: 'prod-sk1',
      supplier: { id: 'sup-aydin', name: 'Aydın Industrial' },
      category: { id: 'cat-seals-gaskets', name: 'Seals & Gaskets' },
      sku: 'AY-SK1',
      moq: 24,
      boxQuantity: 12,
      unit: 'kit',
      hsCode: '8484.20',
      brandName: 'Aydın',
      countryOfOrigin: 'TR',
      gtin13: null,
      mpn: 'SK-1',
      basePrice: {
        amount: 18.0,
        currency: 'USD',
        updatedAt: '2026-05-26T16:25:00.000Z',
        updatedBy: 'u-mock-admin',
      },
      status: 'draft',
      sortOrder: 8,
      createdAt: '2026-02-06T09:05:00.000Z',
      updatedAt: '2026-05-26T16:25:00.000Z',
      translations: [
        en('Pump Seal Kit', 'pump-seal-kit', 'Replacement seal kit for 5HP hydraulic pumps.'),
        tr('Pompa Salmastra Seti', 'pompa-salmastra-seti', false),
        ar('طقم أختام المضخة', 'taqm-akhtam-almudakhkha', false),
      ],
      attributes: [],
      images: [],
    },
    {
      id: 'prod-bt50',
      supplier: { id: 'sup-denizli', name: 'Denizli Tekstil' },
      category: { id: 'cat-bath-towels', name: 'Bath Towels' },
      sku: 'DT-BT50',
      moq: 300,
      boxQuantity: 30,
      unit: 'piece',
      hsCode: '6302.60',
      brandName: 'Denizli Home',
      countryOfOrigin: 'TR',
      gtin13: '8690000000031',
      mpn: 'BT50-100',
      basePrice: {
        amount: 3.95,
        currency: 'USD',
        updatedAt: '2026-05-20T11:40:00.000Z',
        updatedBy: 'u-mock-admin',
      },
      status: 'published',
      sortOrder: 9,
      createdAt: '2026-01-21T09:00:00.000Z',
      updatedAt: '2026-05-20T11:40:00.000Z',
      translations: [
        en(
          'Cotton Bath Towel 50x100cm',
          'cotton-bath-towel-50x100',
          'Mid-weight cotton bath towel.',
        ),
        tr('Pamuklu Banyo Havlusu 50x100cm', 'pamuklu-banyo-havlusu-50x100', true),
        ar('منشفة حمام قطنية 50x100 سم', 'minshafat-hammam-50x100', true),
      ],
      attributes: [attr('Material', '100% Cotton', 0)],
      images: [
        img(
          'img-bt50-1',
          'https://images.tavkil.com/products/bt50-1.jpg',
          'Cotton bath towel',
          true,
        ),
      ],
    },
    {
      id: 'prod-lp18',
      supplier: { id: 'sup-levantine', name: 'Levantine Lighting' },
      category: { id: 'cat-led-panels', name: 'LED Panels' },
      sku: 'LL-LP18',
      moq: 40,
      boxQuantity: 4,
      unit: 'piece',
      hsCode: '9405.40',
      brandName: 'Levantine',
      countryOfOrigin: 'TR',
      gtin13: '8690000000123',
      mpn: 'LP300-18W',
      basePrice: {
        amount: 11.0,
        currency: 'USD',
        updatedAt: '2026-05-22T08:30:00.000Z',
        updatedBy: 'u-mock-admin',
      },
      status: 'archived',
      sortOrder: 10,
      createdAt: '2026-01-28T09:00:00.000Z',
      updatedAt: '2026-04-15T08:30:00.000Z',
      translations: [
        en(
          'LED Panel 300x300 18W',
          'led-panel-300x300-18w',
          'Compact 18W LED panel, 4000K neutral white.',
        ),
        tr('LED Panel 300x300 18W', 'led-panel-300x300-18w-tr', true),
        ar('لوحة LED 300x300 18 واط', 'lawhat-led-300x300-18w', false),
      ],
      attributes: [attr('Power', '18W', 0)],
      images: [],
    },
  ] as Omit<AdminProduct, 'weightKg' | 'cbm' | 'options' | 'variants'>[]
).map((p) => ({ weightKg: null, cbm: null, options: [], variants: [], ...p }));

// ── Generated bulk products (spread across sub-categories, at scale) ──────────
// Deterministic (index-driven, no randomness) so the mock is stable. Statuses
// are mostly published so sections have big, drag-reorderable lists; a slice are
// draft/archived to populate the "Not on storefront" group + status pills.

const GEN_SUPPLIERS = [
  { id: 'sup-denizli', name: 'Denizli Tekstil' },
  { id: 'sup-levantine', name: 'Levantine Aydınlatma' },
  { id: 'sup-aydin', name: 'Aydın Industrial' },
];

// [sub-category id, display name, how many products to generate, SKU prefix]
const GEN_TARGETS: [string, string, number, string][] = [
  ['cat-cookware', 'Cookware', 55, 'CKW'], // large section → test reorder at scale
  ['cat-utensils', 'Utensils', 18, 'UTN'],
  ['cat-food-storage', 'Food Storage', 12, 'FST'],
  ['cat-drinkware', 'Drinkware', 8, 'DRK'],
  ['cat-boxes', 'Boxes & Cartons', 24, 'BOX'],
  ['cat-bags', 'Bags & Pouches', 16, 'BAG'],
  ['cat-labels', 'Labels & Tape', 10, 'LBL'],
  ['cat-gloves', 'Gloves', 45, 'GLV'], // second large section
  ['cat-helmets', 'Helmets', 14, 'HLM'],
  ['cat-hi-vis', 'Hi-Vis Vests', 9, 'HIV'],
  ['cat-tiles', 'Ceramic Tiles', 30, 'TIL'],
  ['cat-vinyl', 'Vinyl Flooring', 20, 'VNL'],
  ['cat-carpet', 'Carpet Tiles', 12, 'CPT'],
  ['cat-led-panels', 'LED Panels', 22, 'LEDX'], // grow an existing section too
  ['cat-bath-towels', 'Bath Towels', 15, 'BTX'],
];

function genProduct(
  catId: string,
  catName: string,
  skuPrefix: string,
  n: number,
  publishedOrder: number,
  status: 'draft' | 'published' | 'archived',
): AdminProduct {
  const supplier = GEN_SUPPLIERS[n % GEN_SUPPLIERS.length];
  const id = `gen-${skuPrefix.toLowerCase()}-${n}`;
  const name = `${catName} Item ${String(n).padStart(2, '0')}`;
  const slug = `${skuPrefix.toLowerCase()}-item-${n}`;
  // Vary translation completeness so the locale badges + "Missing translations"
  // pill have real data: every 4th product is missing TR/AR.
  const complete = n % 4 !== 0;
  return {
    id,
    supplier,
    category: { id: catId, name: catName },
    sku: `${skuPrefix}-${String(1000 + n)}`,
    moq: [10, 25, 50, 100, 250][n % 5],
    boxQuantity: [4, 6, 10, 20][n % 4],
    packSize: null,
    weightKg: null,
    cbm: null,
    unit: 'piece',
    hsCode: null,
    brandName: n % 3 === 0 ? null : supplier.name.split(' ')[0],
    countryOfOrigin: 'TR',
    gtin13: null,
    mpn: null,
    basePrice: {
      amount: 2 + (n % 40) + 0.5,
      currency: 'USD',
      updatedAt: NOW_GEN,
      updatedBy: 'u-mock-admin',
    },
    status,
    sortOrder: publishedOrder,
    isFeatured: false,
    createdAt: '2026-03-05T09:00:00.000Z',
    updatedAt: '2026-05-28T09:00:00.000Z',
    translations: [
      en(name, slug, `${catName} — wholesale item ${n}.`),
      tr(`${catName} Ürün ${n}`, `${slug}-tr`, complete),
      ar(`${catName} ${n}`, `${slug}-ar`, complete),
    ],
    attributes: [attr('Material', 'Mixed', 0)],
    options: [],
    variants: [],
    // Half get an image so the thumbnail + "no image" states are both visible.
    images: n % 2 === 0 ? [img(`${id}-1`, '', name, true)] : [],
  };
}

const NOW_GEN = '2026-05-28T09:00:00.000Z';

const GENERATED_PRODUCTS: AdminProduct[] = GEN_TARGETS.flatMap(
  ([catId, catName, count, prefix]) => {
    let publishedSeq = 0;
    return Array.from({ length: count }, (_, i) => {
      const n = i + 1;
      // ~15% draft, ~8% archived, rest published — deterministic by index.
      const status: 'draft' | 'published' | 'archived' =
        n % 13 === 0 ? 'archived' : n % 7 === 0 ? 'draft' : 'published';
      const order = status === 'published' ? ++publishedSeq : 0;
      return genProduct(catId, catName, prefix, n, order, status);
    });
  },
);

export const PRODUCTS: AdminProduct[] = [...BASE_PRODUCTS, ...GENERATED_PRODUCTS];

/** Find a product by id (case-sensitive — ids are stable slugs). */
export function findProduct(id: string | undefined): AdminProduct | undefined {
  if (!id) return undefined;
  return PRODUCTS.find((p) => p.id === id);
}
