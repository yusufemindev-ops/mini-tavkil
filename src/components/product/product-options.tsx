'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { PublicOption } from '@/lib/queries/public-product';

/**
 * Buyer-facing option picker — Tavkil's, kept as it was.
 *
 * The only thing removed is the cart wiring: Tavkil's version was *controlled*
 * by ProductBuyPanel, which resolved the selection to a priced variant and
 * attached it to an order request. There is no cart and no public price here, so
 * the selection is local state and its job is to answer "what can I ask for" —
 * which is exactly what the buyer needs before using the quote form.
 *
 * Swatches, chips, the selected-label line, the ring on the active swatch and
 * the colour-name fallback are unchanged.
 */

// Common colour-name → hex so swatches show a sensible colour until a real
// per-value image is uploaded (admin feature). Falls back to a neutral grey.
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

export function ProductOptions({ options }: { options: PublicOption[] }) {
  const visible = options.filter((option) => option.values.length > 0);

  // Local, not lifted: nothing downstream consumes the choice. First value of
  // each axis, so the label line is never empty on first paint.
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
              <span className="text-muted-foreground">{option.name}:</span>{' '}
              <span className="text-foreground font-medium">{selectedLabel}</span>
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

// A single colour swatch. The colour tile is always the base; an optional image
// overlays it and HIDES on load error, so a missing/404 swatch image gracefully
// falls back to the colour instead of a broken-image icon.
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
          className="pointer-events-none size-full select-none object-cover"
        />
      )}
    </button>
  );
}
