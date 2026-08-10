import { type AdminProductOption, type ProductOptionPayload } from './queries';

// Draft shapes + factories for the product option editor. Kept separate from the
// component file so fast-refresh works (component file exports only the component).
// `imageUrl` is per-value (e.g. a colour photo); empty when none.
export interface OptionValueDraft {
  key: string;
  label: string;
  imageUrl: string;
  /** Swatch colour (hex). Used when there's no image; image wins if both set. */
  colorHex: string;
}
export interface OptionDraft {
  key: string;
  name: string;
  type: 'swatch' | 'chip';
  visible: boolean;
  values: OptionValueDraft[];
}

const uid = () => crypto.randomUUID();
export const newValueDraft = (): OptionValueDraft => ({
  key: uid(),
  label: '',
  imageUrl: '',
  colorHex: '',
});
export const newOptionDraft = (): OptionDraft => ({
  key: uid(),
  name: '',
  type: 'chip',
  visible: true,
  values: [newValueDraft()],
});

// Load: backend options → editor drafts (empty strings for absent image/colour).
// The draft `key` is seeded from the backend option/value db id so that a
// product's variants (which reference option VALUE ids via `optionValueIds`) can
// be matched back to the reconstructed value drafts. New options/values added in
// the editor get fresh uids; both are unique, stable within one save payload.
export function toOptionDrafts(options: AdminProductOption[]): OptionDraft[] {
  return options.map((o) => ({
    key: o.id,
    name: o.name,
    type: o.type,
    visible: o.isVisible,
    values: o.values.map((v) => ({
      key: v.id,
      label: v.label,
      imageUrl: v.imageUrl ?? '',
      colorHex: v.colorHex ?? '',
    })),
  }));
}

// Save: editor drafts → payload. Drops empty values (no label) and empty options
// (no name or no remaining values), since the backend requires name + ≥1 value.
// Emits the draft `key` for both options AND values so priced variants can
// reference the values that define them within the same save payload.
export function optionsToPayload(drafts: OptionDraft[]): ProductOptionPayload[] {
  return drafts
    .map((o, i) => ({
      key: o.key,
      name: o.name.trim(),
      type: o.type,
      isVisible: o.visible,
      sortOrder: i,
      values: o.values
        .filter((v) => v.label.trim().length > 0)
        .map((v, j) => ({
          key: v.key,
          label: v.label.trim(),
          imageUrl: v.imageUrl.trim() || null,
          colorHex: v.colorHex.trim() || null,
          sortOrder: j,
        })),
    }))
    .filter((o) => o.name.length > 0 && o.values.length > 0);
}
