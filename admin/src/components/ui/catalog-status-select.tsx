import { SelectMenu } from '@/components/ui/select-menu';
import { CatalogStatusDot } from '@/components/ui/catalog-status-badge';

export type CatalogStatus = 'draft' | 'published' | 'archived';

const LABELS: Record<CatalogStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived',
};

// A single gated status control that replaces separate Publish / Unpublish /
// Archive buttons. Controlled by `status`; picking a different option calls
// `onSelect(next)` and the PARENT runs the matching gated mutation, updating
// `status` only on success. A failed publish (publish-gate) therefore reverts
// the visible value automatically, since the control always reflects `status`.
export function CatalogStatusSelect({
  status,
  statuses,
  onSelect,
  disabled,
}: {
  status: string;
  statuses: CatalogStatus[];
  onSelect: (next: CatalogStatus) => void;
  disabled?: boolean;
}) {
  return (
    <SelectMenu
      value={status}
      disabled={disabled}
      onValueChange={(v) => {
        if (v !== status) onSelect(v as CatalogStatus);
      }}
      options={statuses.map((s) => ({
        value: s,
        label: LABELS[s],
        icon: <CatalogStatusDot status={s} />,
      }))}
    />
  );
}
