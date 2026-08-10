import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table } from '@/components/ui/table';
import { type OptionDraft } from './options';
import { cartesian, comboLabels, type VariantRowDraft } from './variants';

// Priced-variant grid (TSC-64). One row per combination of option values; price /
// SKU / MOQ / active are editable per row. Rows are derived from the current
// options via the cartesian product — the parent owns the row state and re-syncs
// it (preserving entered data) whenever the options change.
export function ProductVariantsEditor({
  options,
  rows,
  onChange,
  onSync,
}: {
  options: OptionDraft[];
  rows: VariantRowDraft[];
  onChange: (next: VariantRowDraft[]) => void;
  onSync: () => void;
}) {
  const combos = cartesian(options);
  const patch = (index: number, patchRow: Partial<VariantRowDraft>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patchRow } : r)));

  if (combos.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Add an option with at least one value above to price each variant.
      </p>
    );
  }

  // The grid can fall out of sync with the options (a value added/removed) until
  // synced. Detect a mismatch to prompt a regenerate.
  const outOfSync = rows.length !== combos.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">
          {rows.length} variant{rows.length === 1 ? '' : 's'} · price is admin-only (USD)
        </span>
        <Button variant="outline" size="sm" onClick={onSync}>
          <RefreshCw className="size-3.5" />
          Sync with options
        </Button>
      </div>

      {outOfSync && (
        <p className="text-muted-foreground bg-muted/50 rounded px-3 py-2 text-xs">
          Options changed — press “Sync with options” to add or remove variant rows. Existing prices
          are kept.
        </p>
      )}

      <Table>
        <thead>
          <tr>
            <th>Variant</th>
            <th className="w-32">Price (USD)</th>
            <th className="w-40">SKU</th>
            <th className="w-24">MOQ</th>
            <th className="w-20">Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.valueKeys.join('|')}>
              <td>
                <div className="flex flex-wrap items-center gap-1.5">
                  {comboLabels(options, row.valueKeys).map((label, li) => (
                    <span
                      key={li}
                      className="border-border bg-muted/40 text-foreground rounded border px-1.5 py-0.5 text-xs"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </td>
              <td>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={row.price}
                  onChange={(e) => patch(index, { price: e.target.value })}
                  className="tabular-nums"
                />
              </td>
              <td>
                <Input
                  value={row.sku}
                  placeholder="—"
                  onChange={(e) => patch(index, { sku: e.target.value })}
                />
              </td>
              <td>
                <Input
                  type="number"
                  min="1"
                  value={row.moq}
                  onChange={(e) => patch(index, { moq: e.target.value })}
                  className="tabular-nums"
                />
              </td>
              <td>
                <Switch
                  checked={row.active}
                  onCheckedChange={(v) => patch(index, { active: v })}
                  aria-label="Variant active"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
