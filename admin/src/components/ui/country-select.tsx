import { useMemo } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { countryName, type CountryLocale } from '@repo/countries';
import { cn } from '@/lib/utils';
import {
  buildCountryOptions,
  filterCountryOption,
  isSearchCharAllowed,
  type CountryOption,
} from '@/components/ui/country-select-filter';

// Mirror of the admin <Input> class list so the combobox input looks identical
// to every other admin text field (admin's Input inlines these rather than
// exporting a helper).
const inputClass =
  'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50';

// Searchable country picker on Base UI's Combobox — type to filter, scrollable
// popup with a max height. `variant` switches between a country list (flag
// name) and a phone dial-code list (flag + code, with the name as a hint).
export function CountrySelect({
  value,
  onChange,
  locale,
  variant = 'country',
  id,
  placeholder,
  searchPlaceholder,
  emptyText,
  ariaInvalid,
  className,
  clearable = false,
}: {
  value: string;
  onChange: (code: string) => void;
  locale: CountryLocale;
  variant?: 'country' | 'dial';
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  ariaInvalid?: boolean;
  className?: string;
  // Show an X to reset to "" (for optional fields like a product's country of
  // origin). Omit for required fields (e.g. a supplier's country).
  clearable?: boolean;
}) {
  const options = useMemo<CountryOption[]>(
    () => buildCountryOptions(locale, variant),
    [locale, variant],
  );

  const selected = useMemo(
    () => options.find((o) => o.country.code === value) ?? null,
    [options, value],
  );

  return (
    <Combobox.Root
      items={options}
      value={selected}
      onValueChange={(opt: CountryOption | null) => onChange(opt ? opt.country.code : '')}
      // The flag emoji belongs in the dropdown items, NOT in the input's text —
      // otherwise it stays stuck in the field and the typed query (e.g. "🇹🇷 saudi")
      // never matches. So the country input shows the plain name; dial keeps its
      // flag + code (its search strips non-digits anyway).
      itemToStringLabel={(opt: CountryOption) =>
        variant === 'country' ? countryName(opt.country, locale) : opt.country.dial
      }
      filter={(opt: CountryOption, query: string) => filterCountryOption(opt, query, variant)}
    >
      <div className={cn('relative', className)}>
        <Combobox.Input
          id={id}
          placeholder={placeholder}
          aria-invalid={ariaInvalid}
          inputMode={variant === 'dial' ? 'numeric' : 'text'}
          // Keep typing on-topic: digits only for the dial code, letters only
          // for the country name. Modifier combos and non-printable keys
          // (arrows, backspace, paste shortcuts) always pass through.
          onKeyDown={(e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key.length === 1 && !isSearchCharAllowed(e.key, variant)) {
              e.preventDefault();
            }
          }}
          className={cn(inputClass, clearable && value ? 'pr-14' : 'pr-9')}
        />
        {clearable && value && (
          <button
            type="button"
            aria-label="Clear"
            // onMouseDown + preventDefault so the combobox doesn't steal focus /
            // reopen; reset to "" (None).
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange('');
            }}
            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-8 flex items-center"
          >
            <X className="size-4" />
          </button>
        )}
        <Combobox.Trigger
          aria-label={searchPlaceholder}
          className="text-muted-foreground absolute inset-y-0 right-0 flex items-center pr-3"
        >
          <ChevronsUpDown className="size-4" />
        </Combobox.Trigger>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} align="start" className="z-50">
          <Combobox.Popup
            className={cn(
              'border-border bg-popover text-popover-foreground rounded-md border p-1 shadow-md',
              'max-h-[min(20rem,var(--available-height))] min-w-[max(14rem,var(--anchor-width))] overflow-y-auto',
              'origin-(--transform-origin) transition-[transform,opacity] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
            )}
          >
            {/* The Empty element stays mounted (Base UI live region), so keep it
                box-less and only pad the inner text — otherwise its padding
                leaves a gap above the first item when there are matches. */}
            <Combobox.Empty className="text-muted-foreground text-center text-sm">
              <div className="px-2 py-4">{emptyText ?? 'No results'}</div>
            </Combobox.Empty>
            <Combobox.List>
              {(opt: CountryOption) => (
                <Combobox.Item
                  key={opt.country.code}
                  value={opt}
                  className="data-[highlighted]:bg-foreground/[0.07] flex cursor-default select-none items-center justify-between gap-3 rounded-sm py-1.5 pe-2 ps-2 text-sm outline-none transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {opt.label}
                    {variant === 'dial' && (
                      <span className="text-muted-foreground">
                        {countryName(opt.country, locale)}
                      </span>
                    )}
                  </span>
                  <Combobox.ItemIndicator className="text-primary flex">
                    <Check className="size-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
