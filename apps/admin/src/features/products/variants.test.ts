import { describe, expect, it } from 'vitest';
import type { OptionDraft } from './options';
import type { AdminProduct } from './queries';
import {
  cartesian,
  comboLabels,
  syncVariantRows,
  toVariantRows,
  variantRowsToPayload,
  type VariantRowDraft,
} from './variants';

function value(key: string, label: string) {
  return { key, label, imageUrl: '', colorHex: '' };
}
function option(key: string, name: string, values: OptionDraft['values']): OptionDraft {
  return { key, name, type: 'chip', visible: true, values };
}

// Length (6m / 3m) × Color (Pink / Blue).
const OPTIONS: OptionDraft[] = [
  option('o-len', 'Length', [value('v-6m', '6m'), value('v-3m', '3m')]),
  option('o-col', 'Color', [value('v-pink', 'Pink'), value('v-blue', 'Blue')]),
];

describe('cartesian', () => {
  it('produces one combo per option-value pairing, in option order', () => {
    expect(cartesian(OPTIONS)).toEqual([
      ['v-6m', 'v-pink'],
      ['v-6m', 'v-blue'],
      ['v-3m', 'v-pink'],
      ['v-3m', 'v-blue'],
    ]);
  });

  it('returns an empty product for no effective options (simple product)', () => {
    expect(cartesian([])).toEqual([]);
  });

  it('drops options with no name and values with no label', () => {
    const opts: OptionDraft[] = [
      option('o1', '  ', [value('a', 'A')]), // unnamed → dropped
      option('o2', 'Color', [value('b', 'Blue'), value('c', '  ')]), // empty value dropped
    ];
    expect(cartesian(opts)).toEqual([['b']]);
  });

  it('a single option yields one combo per value', () => {
    expect(cartesian([OPTIONS[1]])).toEqual([['v-pink'], ['v-blue']]);
  });
});

describe('comboLabels', () => {
  it('resolves value keys to their labels', () => {
    expect(comboLabels(OPTIONS, ['v-3m', 'v-blue'])).toEqual(['3m', 'Blue']);
  });

  it('falls back to a dash for an unknown / cleared value', () => {
    expect(comboLabels(OPTIONS, ['gone'])).toEqual(['—']);
  });
});

describe('syncVariantRows', () => {
  it('builds a default row per combo when there is no existing data', () => {
    const rows = syncVariantRows(OPTIONS, []);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({
      valueKeys: ['v-6m', 'v-pink'],
      price: '',
      sku: '',
      moq: '1',
      active: true,
    });
  });

  it('preserves entered price/SKU/MOQ/active by matching the value-key set', () => {
    const existing: VariantRowDraft[] = [
      { valueKeys: ['v-6m', 'v-pink'], price: '9.50', sku: 'SKU-A', moq: '10', active: false },
    ];
    const rows = syncVariantRows(OPTIONS, existing);
    const match = rows.find((r) => r.valueKeys.join() === 'v-6m,v-pink');
    expect(match).toMatchObject({ price: '9.50', sku: 'SKU-A', moq: '10', active: false });
  });

  it('matches regardless of value-key order (option reorder safe)', () => {
    const existing: VariantRowDraft[] = [
      { valueKeys: ['v-pink', 'v-6m'], price: '7.25', sku: '', moq: '1', active: true },
    ];
    const rows = syncVariantRows(OPTIONS, existing);
    const match = rows.find((r) => r.valueKeys.join() === 'v-6m,v-pink');
    expect(match?.price).toBe('7.25');
    // Re-keyed into current option order.
    expect(match?.valueKeys).toEqual(['v-6m', 'v-pink']);
  });

  it('adds new rows for a newly added value without wiping existing prices', () => {
    const priced: VariantRowDraft[] = syncVariantRows(OPTIONS, []).map((r, i) => ({
      ...r,
      price: String(i + 1),
    }));
    const withGreen: OptionDraft[] = [
      OPTIONS[0],
      option('o-col', 'Color', [
        value('v-pink', 'Pink'),
        value('v-blue', 'Blue'),
        value('v-green', 'Green'),
      ]),
    ];
    const rows = syncVariantRows(withGreen, priced);
    expect(rows).toHaveLength(6);
    // Old combos keep their prices…
    expect(rows.find((r) => r.valueKeys.join() === 'v-6m,v-pink')?.price).toBe('1');
    // …new combos start blank.
    expect(rows.find((r) => r.valueKeys.join() === 'v-6m,v-green')?.price).toBe('');
  });

  it('drops rows whose combo no longer exists', () => {
    const priced = syncVariantRows(OPTIONS, []).map((r) => ({ ...r, price: '5' }));
    // Remove the Color axis entirely → only the Length values remain.
    const rows = syncVariantRows([OPTIONS[0]], priced);
    expect(rows.map((r) => r.valueKeys)).toEqual([['v-6m'], ['v-3m']]);
  });
});

describe('variantRowsToPayload', () => {
  it('maps rows to USD-locked variant inputs keyed by value keys', () => {
    const rows: VariantRowDraft[] = [
      { valueKeys: ['v-6m', 'v-pink'], price: '9.50', sku: ' A-1 ', moq: '10', active: true },
      { valueKeys: ['v-3m', 'v-blue'], price: '', sku: '', moq: '0', active: false },
    ];
    expect(variantRowsToPayload(rows)).toEqual([
      {
        sku: 'A-1',
        basePriceAmount: 9.5,
        basePriceCurrency: 'USD',
        moq: 10,
        isActive: true,
        isDefault: false,
        sortOrder: 0,
        optionValueKeys: ['v-6m', 'v-pink'],
      },
      {
        sku: null,
        basePriceAmount: null,
        basePriceCurrency: null,
        moq: 1, // invalid/zero MOQ floored to 1
        isActive: false,
        isDefault: false,
        sortOrder: 1,
        optionValueKeys: ['v-3m', 'v-blue'],
      },
    ]);
  });

  it('treats a negative price as unset (null)', () => {
    const [row] = variantRowsToPayload([
      { valueKeys: ['x'], price: '-3', sku: '', moq: '1', active: true },
    ]);
    expect(row.basePriceAmount).toBeNull();
    expect(row.basePriceCurrency).toBeNull();
  });
});

describe('toVariantRows', () => {
  const product = {
    variants: [
      {
        id: 'def',
        sku: 'BASE',
        basePrice: { amount: 4, currency: 'USD' },
        moq: 5,
        packSize: null,
        weightKg: null,
        imageUrl: null,
        isDefault: true,
        isActive: true,
        sortOrder: 0,
        optionValueIds: [], // simple/default variant → skipped
      },
      {
        id: 'v1',
        sku: 'V-1',
        basePrice: { amount: 8.5, currency: 'USD' },
        moq: 12,
        packSize: null,
        weightKg: null,
        imageUrl: null,
        isDefault: false,
        isActive: false,
        sortOrder: 1,
        optionValueIds: ['val-0-0', 'val-1-1'],
      },
    ],
  } as unknown as AdminProduct;

  it('reconstructs grid rows from priced variants, skipping the default variant', () => {
    expect(toVariantRows(product)).toEqual([
      { valueKeys: ['val-0-0', 'val-1-1'], price: '8.5', sku: 'V-1', moq: '12', active: false },
    ]);
  });

  it('returns no rows for a product without variants', () => {
    expect(toVariantRows(null)).toEqual([]);
  });
});
