import { Select as SelectPrimitive } from '@base-ui/react/select';
import { useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFieldId } from '@/components/ui/field';

export interface SelectOption {
  value: string;
  label: string;
  // Optional leading adornment (e.g. a status dot) shown before the label in
  // both the trigger and the option list.
  icon?: ReactNode;
}

/**
 * Above this many options the popup grows a search box on its own.
 *
 * Chosen so the lists that hurt get one and the lists that don't stay plain: the
 * sub-category filter carries fifteen entries and scrolls, while Role has three
 * and a search box over three options is furniture.
 */
const SEARCH_THRESHOLD = 8;

/**
 * Fold a label down to something worth comparing a query against.
 *
 * Decomposing and dropping combining marks means a Turkish buyer typing `sunger`
 * still finds "Sünger", and `İpli` matches `ipli` — `toLowerCase()` on `İ` yields
 * `i` plus a combining dot, which is exactly the mark this strips. Without it the
 * search would quietly fail on the half of the catalogue that carries diacritics,
 * which is worse than having no search at all.
 */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
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
  searchable,
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
  /** Force the search box on or off. Defaults to on above `SEARCH_THRESHOLD`. */
  searchable?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  const fieldId = useFieldId();
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]));
  const withSearch = searchable ?? options.length >= SEARCH_THRESHOLD;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Cleared as the popup closes rather than in an effect watching `open`: a
  // stale query would silently hide options the next time it opens, and doing it
  // here is the same guarantee without the extra render pass.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery('');
  };

  const shown = useMemo(() => {
    if (!withSearch || !query.trim()) return options;
    const needle = fold(query.trim());
    return options.filter((o) => fold(o.label).includes(needle));
  }, [options, query, withSearch]);

  // Controlled when a `value` is supplied; otherwise uncontrolled via defaultValue.
  const controlProps =
    value !== undefined
      ? { value, onValueChange: (v: unknown) => onValueChange?.(v as string) }
      : { defaultValue, onValueChange: (v: unknown) => onValueChange?.(v as string) };

  return (
    <SelectPrimitive.Root
      items={items}
      modal={false}
      disabled={disabled}
      open={open}
      onOpenChange={handleOpenChange}
      {...controlProps}
    >
      <SelectPrimitive.Trigger
        id={id ?? fieldId}
        aria-label={ariaLabel}
        className={cn(
          'border-input bg-background text-foreground flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-base sm:text-sm outline-none',
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
            {withSearch && (
              // Sticky so it stays reachable once the list scrolls, which is the
              // case that made the search worth adding.
              <div className="bg-popover sticky top-0 z-10 -m-1 mb-1 p-1">
                <div className="border-input bg-background flex items-center gap-2 rounded-md border px-2.5">
                  <Search className="text-muted-foreground size-3.5 flex-none" aria-hidden />
                  <input
                    value={query}
                    autoFocus
                    // Base UI's Select runs its own typeahead on keydown: without
                    // this, typing "gl" jumps the highlight to "Glass Cleaning"
                    // and the letters never reach the input. Arrows, Enter, Escape
                    // and Tab are let through so the list stays keyboard-operable
                    // from inside the box.
                    onKeyDown={(event) => {
                      const passthrough = [
                        'ArrowDown',
                        'ArrowUp',
                        'Enter',
                        'Escape',
                        'Tab',
                        'Home',
                        'End',
                      ];
                      if (!passthrough.includes(event.key)) event.stopPropagation();
                    }}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search…"
                    aria-label="Search options"
                    className="text-foreground placeholder:text-muted-foreground h-8 w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
            )}

            {shown.length === 0 ? (
              <div className="text-muted-foreground px-2.5 py-3 text-center text-sm">
                {query.trim() ? `No match for “${query.trim()}”` : emptyMessage}
              </div>
            ) : (
              shown.map((o) => (
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
