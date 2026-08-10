import { Select as SelectPrimitive } from '@base-ui/react/select';
import type { ReactNode } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFieldId } from '@/components/ui/field';

export interface SelectOption {
  value: string;
  label: string;
  // Optional leading adornment (e.g. a status dot) shown before the label in
  // both the trigger and the option list.
  icon?: ReactNode;
}

// Shadcn-style select on Base UI's Select primitive — a themed trigger + popup
// listbox (replaces the native <select>'s OS dropdown). Works controlled
// (`value` + `onValueChange`) or uncontrolled (`defaultValue`). Adopts the
// surrounding Field's id for label association when no `id` is given.
export function SelectMenu({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = 'Select…',
  emptyMessage = 'No options available',
  id,
  className,
  disabled,
  'aria-label': ariaLabel,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  emptyMessage?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  const fieldId = useFieldId();
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]));

  // Controlled when a `value` is supplied; otherwise uncontrolled via defaultValue.
  const controlProps =
    value !== undefined
      ? { value, onValueChange: (v: unknown) => onValueChange?.(v as string) }
      : { defaultValue, onValueChange: (v: unknown) => onValueChange?.(v as string) };

  return (
    <SelectPrimitive.Root items={items} modal={false} disabled={disabled} {...controlProps}>
      <SelectPrimitive.Trigger
        id={id ?? fieldId}
        aria-label={ariaLabel}
        className={cn(
          'border-input bg-background text-foreground flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm outline-none',
          'focus-visible:ring-ring focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
          'data-[popup-open]:border-primary',
          className,
        )}
      >
        <SelectPrimitive.Value className="min-w-0 flex-1 text-start" placeholder={placeholder}>
          {(val: unknown) => {
            const opt = options.find((o) => o.value === val);
            if (!opt) return placeholder;
            return (
              <span className="flex min-w-0 items-center gap-2">
                {opt.icon}
                <span className="truncate">{opt.label}</span>
              </span>
            );
          }}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon className="text-muted-foreground flex flex-none">
          <ChevronsUpDown className="size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          sideOffset={6}
          align="start"
          alignItemWithTrigger={false}
          className="z-50"
        >
          <SelectPrimitive.Popup
            className={cn(
              'border-border bg-popover text-popover-foreground min-w-[var(--anchor-width)] rounded-lg border p-1 shadow-md outline-none',
              'max-h-[min(22rem,var(--available-height))] overflow-y-auto',
              'origin-(--transform-origin) transition-[transform,opacity] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
            )}
          >
            {options.length === 0 ? (
              <div className="text-muted-foreground px-2.5 py-3 text-center text-sm">
                {emptyMessage}
              </div>
            ) : (
              options.map((o) => (
                <SelectPrimitive.Item
                  key={o.value}
                  value={o.value}
                  className={cn(
                    'flex cursor-default select-none items-center justify-between gap-2 rounded-md py-1.5 pe-2 ps-2.5 text-sm outline-none',
                    'data-[highlighted]:bg-muted data-[highlighted]:text-foreground',
                  )}
                >
                  <SelectPrimitive.ItemText className="flex min-w-0 items-center gap-2">
                    {o.icon}
                    <span className="truncate">{o.label}</span>
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="text-primary flex flex-none">
                    <Check className="size-4" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))
            )}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
