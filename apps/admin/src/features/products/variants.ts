import { type OptionDraft } from './options';
import { type AdminProduct, type ProductVariantPayload } from './queries';

// One editable row of the variant grid (TSC-64). A row is one combination of
// option values — identified by `valueKeys` (one option-VALUE draft key per
// option axis, in option order). Price/SKU/MOQ/active live per row. Values are
// kept as strings (raw input state); numbers are parsed at save time.
export interface VariantRowDraft {
  valueKeys: string[];
  price: string;
  sku: string;
  moq: string;
  active: boolean;
}

const DEFAULT_MOQ = '1';

// The options that actually contribute variant combinations: named, with ≥1
// labelled value. Mirrors optionsToPayload's drop rules so the grid matches what
// gets saved.
function effectiveOptions(
  options: OptionDraft[],
): { key: string; values: OptionDraft['values'] }[] {
  return options
    .filter((o) => o.name.trim().length > 0)
    .map((o) => ({ key: o.key, values: o.values.filter((v) => v.label.trim().length > 0) }))
    .filter((o) => o.values.length > 0);
}

// Cartesian product of the option value keys → each combo is an array of value
// keys (one per option, in option order). Empty when there are no effective
// options (a simple product has no grid).
export function cartesian(options: OptionDraft[]): string[][] {
  const eff = effectiveOptions(options);
  if (eff.length === 0) return [];
  return eff.reduce<string[][]>(
    (acc, opt) => acc.flatMap((combo) => opt.values.map((v) => [...combo, v.key])),
    [[]],
  );
}

// Order-independent signature of a value-key set, for matching a combination to
// an existing row regardless of option order.
function keySig(keys: string[]): string {
  return [...keys].sort().join('|');
}

// Recompute the grid rows from the current options, PRESERVING already-entered
// data (price/SKU/MOQ/active) by matching on the set of value keys. New combos
// (e.g. after adding an option value) get default rows; combos that no longer
// exist are dropped. Never wipes existing prices.
export function syncVariantRows(
  options: OptionDraft[],
  existing: VariantRowDraft[],
): VariantRowDraft[] {
  const combos = cartesian(options);
  const bySig = new Map(existing.map((r) => [keySig(r.valueKeys), r]));
  return combos.map((valueKeys) => {
    const prev = bySig.get(keySig(valueKeys));
    // Keep the freshly-ordered valueKeys (option order may have changed).
    return prev
      ? { ...prev, valueKeys }
      : { valueKeys, price: '', sku: '', moq: DEFAULT_MOQ, active: true };
  });
}

// Display labels for a combination (e.g. ["Pink", "6m"]), resolved from the
// current option drafts. Falls back to "—" for a value whose label was cleared.
export function comboLabels(options: OptionDraft[], valueKeys: string[]): string[] {
  return valueKeys.map((key) => {
    for (const o of options) {
      const v = o.values.find((vv) => vv.key === key);
      if (v) return v.label.trim() || '—';
    }
    return '—';
  });
}

// Seed grid rows from a loaded product: match each variant's optionValueIds to
// the draft value keys (toOptionDrafts seeds value keys from the backend value
// db id, so ids === keys here). Skips the default/simple variant (no option
// values) — that one feeds the single base-price field instead.
export function toVariantRows(product: AdminProduct | null): VariantRowDraft[] {
  return (product?.variants ?? [])
    .filter((v) => v.optionValueIds.length > 0)
    .map((v) => ({
      valueKeys: v.optionValueIds,
      price: v.basePrice ? String(v.basePrice.amount) : '',
      sku: v.sku ?? '',
      moq: String(v.moq ?? 1),
      active: v.isActive,
    }));
}

function parsePrice(raw: string): number | null {
  const s = raw.trim();
  if (s === '') return null;
  const n = Number(s);
  return !Number.isNaN(n) && n >= 0 ? n : null;
}

// Grid rows → variant payload. One variant per row, keyed by its value keys.
// USD-locked (Pattern A). Never `isDefault` — the default is the simple-product
// path only.
export function variantRowsToPayload(rows: VariantRowDraft[]): ProductVariantPayload[] {
  return rows.map((r, i) => {
    const amount = parsePrice(r.price);
    const moqNum = Number(r.moq);
    return {
      sku: r.sku.trim() || null,
      basePriceAmount: amount,
      basePriceCurrency: amount == null ? null : 'USD',
      moq: Number.isInteger(moqNum) && moqNum > 0 ? moqNum : 1,
      isActive: r.active,
      isDefault: false,
      sortOrder: i,
      optionValueKeys: r.valueKeys,
    };
  });
}
