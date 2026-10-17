import { CountrySelect } from '@/components/ui/country-select';
import { Input } from '@/components/ui/input';
import { useFieldId } from '@/components/ui/field';

// Dial-code country picker + national number. The dial select is keyed by
// country code (so e.g. +1 US vs +1 Canada stay distinct) and the resolved
// "+90"-style code is what callers persist alongside the number.
export function PhoneInput({
  countryCode,
  number,
  onCountryChange,
  onNumberChange,
  id,
  invalid,
}: {
  countryCode: string;
  number: string;
  onCountryChange: (code: string) => void;
  onNumberChange: (number: string) => void;
  id?: string;
  invalid?: boolean;
}) {
  const fieldId = useFieldId();
  return (
    <div className="flex gap-2">
      <CountrySelect
        variant="dial"
        value={countryCode}
        onChange={onCountryChange}
        locale="en"
        placeholder="Search code"
        searchPlaceholder="Search code"
        emptyText="No match"
        className="w-[120px] flex-none"
      />
      <Input
        id={id ?? fieldId}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={number}
        // Phone numbers are digits (+ spaces for readability) only — strip
        // anything else as it's typed/pasted.
        onChange={(e) => onNumberChange(e.target.value.replace(/[^\d\s]/g, ''))}
        aria-invalid={invalid}
        placeholder="555 123 4567"
      />
    </div>
  );
}
