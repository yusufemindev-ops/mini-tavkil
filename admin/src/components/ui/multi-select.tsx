import { Link } from 'react-router';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useFieldId } from '@/components/ui/field';
import { type SelectOption } from '@/components/ui/select-menu';

// Multi-select on Base UI's Select (multiple mode): a themed trigger + popup
// listbox, with the chosen items rendered as a clear removable list below.
// When `firstIsPrimary` is set, the first item is badged "Primary". When
// `itemTo` is given, each item label links to that route.
export function MultiSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  id,
  disabled,
  firstIsPrimary,
  emptyHint,
  itemTo,
}: {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  firstIsPrimary?: boolean;
  emptyHint?: string;
  itemTo?: (value: string) => string;
}) {
  const fieldId = useFieldId();
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const remove = (v: string) => onValueChange(value.filter((x) => x !== v));

  return (
    <div>
      <SelectPrimitive.Root
        multiple
        modal={false}
        value={value}
        disabled={disabled}
        onValueChange={(v) => onValueChange(v as string[])}
      >
        <SelectPrimitive.Trigger
          id={id ?? fieldId}
          className={cn(
            'border-input bg-background text-foreground flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm outline-none',
            'focus-visible:ring-ring focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
            'data-[popup-open]:border-primary',
          )}
        >
          <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
            {value.length ? `${value.length} selected` : placeholder}
          </span>
          <SelectPrimitive.Icon className="text-muted-foreground flex">
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
              {options.map((o) => (
                <SelectPrimitive.Item
                  key={o.value}
                  value={o.value}
                  className={cn(
                    'flex cursor-default select-none items-center justify-between gap-2 rounded-md py-1.5 pe-2 ps-2.5 text-sm outline-none',
                    'data-[highlighted]:bg-muted data-[highlighted]:text-foreground',
                  )}
                >
                  <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="text-primary flex">
                    <Check className="size-4" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Popup>
          </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {value.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {value.map((v, i) => (
            <li
              key={v}
              className="border-border bg-muted/30 flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[13px]"
            >
              {itemTo ? (
                <Link
                  to={itemTo(v)}
                  className="text-primary flex-1 truncate hover:underline"
                  title={`Open ${labelOf(v)}`}
                >
                  {labelOf(v)}
                </Link>
              ) : (
                <span className="text-foreground flex-1 truncate">{labelOf(v)}</span>
              )}
              {firstIsPrimary && i === 0 && <Badge variant="primary">Primary</Badge>}
              <button
                type="button"
                aria-label={`Remove ${labelOf(v)}`}
                onClick={() => remove(v)}
                className="text-muted-foreground hover:text-destructive flex-none"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : emptyHint ? (
        <p className="text-muted-foreground mt-2 text-xs">{emptyHint}</p>
      ) : null}
    </div>
  );
}
