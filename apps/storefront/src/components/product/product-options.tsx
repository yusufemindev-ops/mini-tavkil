'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { PublicOption } from '@/lib/queries/public-product';
import { BidiText } from '@/components/bidi-text';

/** Product option selector for colors, dimensions, and specifications. */

// Fallback color mapping for swatch backgrounds.
const COLOR_MAP: Record<string, string> = {
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  graphite: '#374151',
  black: '#111827',
  white: '#e5e7eb',
  silver: '#cbd5e1',
  gold: '#d4af37',
  orange: '#f2640c',
  yellow: '#eab308',
  pink: '#ec4899',
  purple: '#9333ea',
  cerise: '#db2777',
  cream: '#f5f0e1',
  ivory: '#f7f3e8',
  grey: '#9ca3af',
  gray: '#9ca3af',
  brown: '#92400e',
};
const colourFor = (label: string) => COLOR_MAP[label.trim().toLowerCase()] ?? '#9ca3af';

/** Maps standard option name keys to localization keys. */
const OPTION_KEYS: Record<string, string> = {
  size: 'opt_size',
  length: 'opt_length',
  diameter: 'opt_diameter',
};

export function ProductOptions({ options }: { options: PublicOption[] }) {
  const t = useTranslations('store');
  const visible = options.filter((option) => option.values.length > 0);

  const optionName = (name: string) => {
    const key = OPTION_KEYS[name.trim().toLowerCase()];
    return key ? t(key) : name;
  };

  // Default to the first value of each option axis on initial render.
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(visible.map((option) => [option.name, option.values[0]?.label ?? ''])),
  );

  if (visible.length === 0) return null;

  return (
    <div className="mt-6 space-y-4">
      {visible.map((option) => {
        const selectedLabel = selected[option.name];
        return (
          <div key={option.name}>
            <div className="text-sm">
              {/* Colon is kept inside the BidiText isolate to maintain correct placement in RTL. */}
              <BidiText className="text-muted-foreground">{optionName(option.name)}:</BidiText>{' '}
              <BidiText className="text-foreground font-medium">{selectedLabel}</BidiText>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = value.label === selectedLabel;
                const pick = () =>
                  setSelected((current) => ({ ...current, [option.name]: value.label }));

                if (option.type === 'swatch') {
                  return (
                    <SwatchButton
                      key={value.label}
                      label={value.label}
                      imageUrl={value.imageUrl}
                      colorHex={value.colorHex}
                      isSelected={isSelected}
                      onClick={pick}
                    />
                  );
                }

                return (
                  <button
                    key={value.label}
                    type="button"
                    onClick={pick}
                    aria-pressed={isSelected}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-sm transition-colors',
                      isSelected
                        ? 'border-primary text-foreground bg-primary/10'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                    dir="auto"
                  >
                    {value.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Swatch button displaying color tile with optional image overlay fallback.
function SwatchButton({
  label,
  imageUrl,
  colorHex,
  isSelected,
  onClick,
}: {
  label: string;
  imageUrl: string | null;
  colorHex: string | null;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={isSelected}
      className={cn(
        'size-9 overflow-hidden rounded-md border',
        isSelected
          ? 'ring-primary ring-offset-background border-transparent ring-2 ring-offset-2'
          : 'border-border',
      )}
      style={{ backgroundColor: colorHex ?? colourFor(label) }}
    >
      {imageUrl && imgOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={label}
          draggable={false}
          onError={() => setImgOk(false)}
          className="pointer-events-none size-full object-cover select-none"
        />
      )}
    </button>
  );
}
