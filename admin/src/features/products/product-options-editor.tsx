import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SelectMenu } from '@/components/ui/select-menu';
import { SingleImageUpload } from '@/components/ui/media-upload';
import { newOptionDraft, newValueDraft, type OptionDraft, type OptionValueDraft } from './options';

const TYPE_OPTIONS = [
  { value: 'swatch', label: 'Image / colour tiles' },
  { value: 'chip', label: 'Text chips' },
];

// Nested repeatable editor: options → values. Fully admin-defined — the name
// ("Color", "Thickness", "Width", …), the display type, and each value (label
// optional image) are all controlled here. Selections never change price/SKU.
export function ProductOptionsEditor({
  options,
  onChange,
}: {
  options: OptionDraft[];
  onChange: (next: OptionDraft[]) => void;
}) {
  const patchOption = (key: string, patch: Partial<OptionDraft>) =>
    onChange(options.map((o) => (o.key === key ? { ...o, ...patch } : o)));

  const removeOption = (key: string) => onChange(options.filter((o) => o.key !== key));

  const moveOption = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= options.length) return;
    const next = [...options];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const patchValue = (oKey: string, vKey: string, patch: Partial<OptionValueDraft>) => {
    const option = options.find((o) => o.key === oKey);
    if (!option) return;
    patchOption(oKey, {
      values: option.values.map((v) => (v.key === vKey ? { ...v, ...patch } : v)),
    });
  };

  const addValue = (oKey: string) => {
    const option = options.find((o) => o.key === oKey);
    if (!option) return;
    patchOption(oKey, { values: [...option.values, newValueDraft()] });
  };

  const removeValue = (oKey: string, vKey: string) => {
    const option = options.find((o) => o.key === oKey);
    if (!option) return;
    patchOption(oKey, { values: option.values.filter((v) => v.key !== vKey) });
  };

  return (
    <div className="flex flex-col gap-4">
      {options.map((opt, index) => (
        <div key={opt.key} className="border-border rounded-md border p-3">
          {/* Option header: name · display type · reorder · visible · remove */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={opt.name}
              onChange={(e) => patchOption(opt.key, { name: e.target.value })}
              placeholder="Option name (e.g. Color, Thickness)"
              className="min-w-[10rem] flex-1"
            />
            <div className="w-44 flex-none">
              <SelectMenu
                value={opt.type}
                onValueChange={(v) => patchOption(opt.key, { type: v as OptionDraft['type'] })}
                options={TYPE_OPTIONS}
              />
            </div>
            <div className="flex flex-none items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                title="Move up"
                disabled={index === 0}
                onClick={() => moveOption(index, -1)}
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                title="Move down"
                disabled={index === options.length - 1}
                onClick={() => moveOption(index, 1)}
              >
                <ArrowDown className="size-3.5" />
              </Button>
            </div>
            <label className="text-muted-foreground flex flex-none items-center gap-1.5 text-xs">
              <Switch
                checked={opt.visible}
                onCheckedChange={(v) => patchOption(opt.key, { visible: v })}
                aria-label="Visible on storefront"
              />
              Visible
            </label>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 flex-none"
              title="Remove option"
              onClick={() => removeOption(opt.key)}
            >
              <X className="size-3.5" />
            </Button>
          </div>

          {/* Values */}
          <div className="mt-3 flex flex-col gap-2 pl-1">
            {opt.values.map((value) => (
              <div key={value.key} className="flex items-center gap-2">
                {opt.type === 'swatch' && (
                  <div className="flex flex-none items-center gap-2">
                    {/* Colour picker shown until an image is uploaded (image wins). */}
                    {!value.imageUrl && (
                      <input
                        type="color"
                        value={value.colorHex || '#cccccc'}
                        onChange={(e) =>
                          patchValue(opt.key, value.key, { colorHex: e.target.value })
                        }
                        title="Pick a colour"
                        aria-label="Pick a colour"
                        className="border-border size-9 flex-none cursor-pointer rounded-md border bg-transparent p-1"
                      />
                    )}
                    <SingleImageUpload
                      value={value.imageUrl}
                      onChange={(url) => patchValue(opt.key, value.key, { imageUrl: url })}
                      label="Image"
                      size="sm"
                    />
                  </div>
                )}
                <Input
                  value={value.label}
                  onChange={(e) => patchValue(opt.key, value.key, { label: e.target.value })}
                  placeholder="Value (e.g. Red, 2 mm)"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 flex-none"
                  title="Remove value"
                  onClick={() => removeValue(opt.key, value.key)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="mt-1 self-start"
              onClick={() => addValue(opt.key)}
            >
              <Plus className="size-3.5" />
              Add value
            </Button>
          </div>
        </div>
      ))}

      {options.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No options. Add one if this product comes in variants (color, size, thickness…).
        </p>
      )}

      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => onChange([...options, newOptionDraft()])}
      >
        <Plus className="size-3.5" />
        Add option
      </Button>
    </div>
  );
}
