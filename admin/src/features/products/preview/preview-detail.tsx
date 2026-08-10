import { useState } from 'react';
import { ImageIcon, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminProduct, AdminProductAttribute, AdminProductOption } from '../queries';
import {
  colourFor,
  formatPrice,
  pickTranslation,
  primaryImageUrl,
  type LocaleCode,
} from './shared';
import { CatalogStatusBadge } from '@/components/ui/catalog-status-badge';
import { Breadcrumb, ProductImage } from './preview-ui';

// Storefront-style product detail preview. Resolves name/description/attributes
// for the chosen locale (English fallback) so the language toggle + RTL work.
export function PreviewDetail({
  product,
  locale,
  categoryHref,
  catalogueHref,
}: {
  product: AdminProduct;
  locale: LocaleCode;
  // Link target for the sub-category crumb → its grid preview (undefined when the
  // product has no category, so it stays plain text).
  categoryHref?: string;
  // Link target for the "Catalogue" crumb → the catalogue index preview.
  catalogueHref?: string;
}) {
  const translation = pickTranslation(product, locale);
  const contentLocale = translation?.locale ?? 'en';
  const name = translation?.name ?? product.sku ?? 'Untitled product';
  const description = translation?.description ?? null;
  const attributes = product.attributes
    .filter((a) => a.locale === contentLocale)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const subName = product.category?.name ?? 'Uncategorized';
  const currency = product.basePrice?.currency ?? 'USD';
  const options = product.options.filter((o) => o.isVisible);

  // Selecting option values resolves to a variant, whose price/MOQ drive the
  // block (price lives on the variant). Falls back to the product-level values.
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      options
        .map((o) => [o.id, o.values[0]?.id] as const)
        .filter((e): e is readonly [string, string] => Boolean(e[1])),
    ),
  );
  const selectedValueIds = options
    .map((o) => selected[o.id])
    .filter((id): id is string => Boolean(id));
  const variant = product.variants.find(
    (v) =>
      v.optionValueIds.length === selectedValueIds.length &&
      v.optionValueIds.every((id) => selectedValueIds.includes(id)),
  );
  const displayPrice = variant?.basePrice ?? product.basePrice;
  const displayMoq = variant?.moq ?? product.moq;

  const keyFacts: { label: string; value: string; mono?: boolean }[] = [
    { label: 'Min. order', value: `${product.moq} ${product.unit}`, mono: true },
    ...(product.brandName ? [{ label: 'Brand', value: product.brandName }] : []),
    ...(product.countryOfOrigin ? [{ label: 'Origin', value: product.countryOfOrigin }] : []),
  ];

  const packagingFacts: { label: string; value: string }[] = [
    ...(product.boxQuantity != null
      ? [{ label: 'Units per box', value: String(product.boxQuantity) }]
      : []),
    ...(product.weightKg != null
      ? [{ label: 'Weight (KG)', value: String(product.weightKg) }]
      : []),
    ...(product.cbm != null ? [{ label: 'Volume (CBM)', value: String(product.cbm) }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-[var(--width-container,1200px)] px-5 py-8">
      <Breadcrumb
        items={[
          { label: 'Home' },
          { label: 'Catalogue', to: catalogueHref },
          { label: subName, to: categoryHref },
          { label: name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <Gallery product={product} name={name} />

        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">{name}</h1>
          <div className="text-muted-foreground mt-1 font-mono text-sm">{product.sku ?? '—'}</div>

          <dl className="border-border bg-card mt-6 flex flex-wrap overflow-hidden rounded-lg border">
            {keyFacts.map((fact, i) => (
              <div
                key={fact.label}
                className={cn('min-w-[8rem] flex-1 p-3.5', i > 0 && 'border-border border-s')}
              >
                <dt className="text-muted-foreground text-[0.72rem] uppercase tracking-wide">
                  {fact.label}
                </dt>
                <dd className={cn('text-foreground mt-1 text-sm', fact.mono && 'font-mono')}>
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          {options.length > 0 && (
            <OptionsPicker
              options={options}
              selected={selected}
              onSelect={(oid, vid) => setSelected((s) => ({ ...s, [oid]: vid }))}
            />
          )}

          {/* Price block — verified-buyer view uses the base price directly. */}
          <div className="mt-6">
            <div className="border-border bg-muted/40 mb-4 rounded-lg border p-[18px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground text-[0.85rem] font-semibold">
                  Your price
                </span>
                <span className="text-foreground font-mono text-[1.6rem] font-bold">
                  {displayPrice ? formatPrice(displayPrice.amount, currency) : '—'}
                  <small className="text-muted-foreground ms-1 text-[0.8rem] font-medium">
                    /{product.unit}
                  </small>
                </span>
              </div>
              <p className="text-muted-foreground mt-3 text-[0.82rem]">
                Minimum order{' '}
                <b className="text-foreground font-mono">
                  {displayMoq} {product.unit}
                </b>
              </p>
            </div>

            {product.supplier?.name && (
              <div className="border-border bg-card mb-4 rounded-lg border p-4">
                <div className="text-muted-foreground text-[0.72rem] font-semibold uppercase tracking-wide">
                  Supplier
                </div>
                <div className="text-foreground mt-1.5 flex items-center gap-1.5 font-medium">
                  {product.supplier.name}
                  {product.countryOfOrigin && (
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-[0.82rem] font-normal">
                      <MapPin className="size-[13px]" />
                      {product.countryOfOrigin}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12">
        <Tabs attributes={attributes} packagingFacts={packagingFacts} description={description} />
      </div>
    </div>
  );
}

function Gallery({ product, name }: { product: AdminProduct; name: string }) {
  const images = product.images;
  const [active, setActive] = useState(0);
  const mainSrc = images[active]?.url ?? primaryImageUrl(product);

  return (
    <div className="lg:sticky lg:top-[calc(var(--height-header)+1rem)]">
      <div className="border-border bg-card mb-3 inline-flex rounded-md border p-0.5">
        <span className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[0.82rem] font-semibold">
          <ImageIcon className="size-3.5" />
          Images
        </span>
      </div>

      <div className="flex gap-3">
        <div className="flex w-[68px] flex-none flex-col gap-3 sm:w-[76px]">
          {(images.length > 0 ? images : [null]).map((img, i) => (
            <button
              key={img?.id ?? i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === active}
              className={cn(
                'overflow-hidden rounded-lg border transition-all',
                i === active
                  ? 'border-primary ring-primary/25 ring-2'
                  : 'border-border opacity-60 hover:opacity-100',
              )}
            >
              <ProductImage src={img?.url ?? null} alt={name} className="aspect-square w-full" />
            </button>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Status badge on the image (not the navbar) — matches the card look
              in the catalogue/category grids. Hidden for a published product. */}
          {product.status !== 'published' && (
            <div className="absolute start-3 top-3 z-10">
              <CatalogStatusBadge status={product.status} />
            </div>
          )}
          <ProductImage
            src={mainSrc}
            alt={name}
            className="border-border aspect-[4/3] w-full rounded-lg border"
          />
        </div>
      </div>
    </div>
  );
}

function OptionsPicker({
  options,
  selected,
  onSelect,
}: {
  options: AdminProductOption[];
  selected: Record<string, string>;
  onSelect: (optionId: string, valueId: string) => void;
}) {
  return (
    <div className="mt-6 space-y-4">
      {options.map((option) => {
        const selectedId = selected[option.id];
        const selectedLabel = option.values.find((v) => v.id === selectedId)?.label;
        return (
          <div key={option.id}>
            <div className="text-sm">
              <span className="text-muted-foreground">{option.name}:</span>{' '}
              <span className="text-foreground font-medium">{selectedLabel}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = value.id === selectedId;
                const pick = () => onSelect(option.id, value.id);

                if (option.type === 'swatch') {
                  return (
                    <button
                      key={value.id}
                      type="button"
                      onClick={pick}
                      title={value.label}
                      aria-label={value.label}
                      aria-pressed={isSelected}
                      className={cn(
                        'size-9 overflow-hidden rounded-md border',
                        isSelected
                          ? 'ring-primary ring-offset-background border-transparent ring-2 ring-offset-2'
                          : 'border-border',
                      )}
                      style={
                        value.imageUrl
                          ? undefined
                          : { backgroundColor: value.colorHex ?? colourFor(value.label) }
                      }
                    >
                      {value.imageUrl && (
                        <img
                          src={value.imageUrl}
                          alt={value.label}
                          className="size-full object-cover"
                        />
                      )}
                    </button>
                  );
                }

                return (
                  <button
                    key={value.id}
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

function Tabs({
  attributes,
  packagingFacts,
  description,
}: {
  attributes: AdminProductAttribute[];
  packagingFacts: { label: string; value: string }[];
  description: string | null;
}) {
  const hasSpecs = attributes.length > 0 || packagingFacts.length > 0;
  const tabs = [
    ...(hasSpecs ? [{ id: 'specs', label: 'Specifications' }] : []),
    { id: 'about', label: 'Description' },
  ];
  const [active, setActive] = useState(tabs[0]?.id ?? 'about');

  return (
    <div>
      <div role="tablist" className="border-border flex gap-1 border-b">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.id)}
              className={cn(
                '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {hasSpecs && (
        <div role="tabpanel" hidden={active !== 'specs'} className="pt-6">
          <div className="space-y-8">
            {attributes.length > 0 && (
              <dl className="border-border bg-border grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2">
                {attributes.map((a, idx) => (
                  <div key={`${a.name}-${idx}`} className="bg-card grid grid-cols-[40%_1fr]">
                    <dt className="text-muted-foreground p-3.5 text-sm">{a.name}</dt>
                    <dd className="text-foreground p-3.5 text-sm font-medium">{a.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {packagingFacts.length > 0 && (
              <div>
                <h3 className="text-foreground mb-3 text-sm font-semibold">
                  Packaging &amp; logistics
                </h3>
                <dl className="border-border bg-border grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2">
                  {packagingFacts.map((f) => (
                    <div key={f.label} className="bg-card grid grid-cols-[40%_1fr]">
                      <dt className="text-muted-foreground p-3.5 text-sm">{f.label}</dt>
                      <dd className="text-foreground p-3.5 font-mono text-sm font-medium">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      )}

      <div role="tabpanel" hidden={active !== 'about'} className="pt-6">
        <p className="text-muted-foreground max-w-3xl leading-relaxed">
          {description ?? 'No description provided yet.'}
        </p>
      </div>
    </div>
  );
}
