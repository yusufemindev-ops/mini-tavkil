import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import type { AdminProduct } from '../queries';
import { formatPrice, previewSearch, resolveName, type LocaleCode, type Theme } from './shared';
import { Breadcrumb, ProductImage } from './preview-ui';

// A sidebar filter row: a sibling/child category the buyer can jump to. Mirrors
// the storefront CategoryFilters — each is a clean link to that category's own
// preview, the current one highlighted.
export interface SidebarItem {
  label: string;
  to: string;
  active: boolean;
  // A draft sub-category (preview only) — badged in the filter, hidden live.
  isDraft?: boolean;
}

// A single storefront-style card. Every card links to the product detail preview,
// carrying the current ?locale&theme so the detail opens in the same language/theme.
function ProductCard({ product, name, to }: { product: AdminProduct; name: string; to: string }) {
  const image = product.images.find((i) => i.isPrimary)?.url ?? product.images[0]?.url ?? null;
  const currency = product.basePrice?.currency ?? 'USD';
  const price = product.basePrice ? formatPrice(product.basePrice.amount, currency) : null;
  const isDraft = product.status !== 'published';

  return (
    <Link
      to={to}
      className="border-border bg-card hover:border-primary group relative flex flex-col overflow-hidden rounded-lg border text-start transition-colors"
    >
      <ProductImage src={image} alt={name} className="aspect-[4/3] w-full" />
      {isDraft && (
        <span className="bg-warning-soft text-warning absolute start-2 top-2 rounded px-2 py-0.5 text-[11px] font-semibold">
          Draft
        </span>
      )}
      <div className="flex flex-1 flex-col p-[15px]">
        <span className="text-muted-foreground font-mono text-[0.68rem]">{product.sku ?? '—'}</span>
        <h4 className="text-foreground my-1 text-base font-bold leading-tight tracking-tight">
          {name}
        </h4>
        <div className="border-border mt-auto flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground text-[0.76rem]">
            MOQ <b className="text-foreground font-mono">{product.moq}</b>
          </span>
          {price && <span className="text-foreground font-mono text-sm font-bold">{price}</span>}
        </div>
      </div>
    </Link>
  );
}

// Storefront category-PAGE preview: breadcrumb (with a linked parent crumb for a
// sub-category), the TYPE sidebar of sibling categories (each a link), and the
// product grid. Matches /catalogue/[category] exactly (products, not tiles — the
// tiles live on the catalogue index, previewed separately).
export function PreviewGrid({
  categoryName,
  description,
  parentCrumb,
  sidebar,
  products,
  locale,
  theme,
}: {
  categoryName: string;
  description: string | null;
  parentCrumb: { label: string; to: string } | null;
  sidebar: readonly SidebarItem[];
  products: readonly AdminProduct[];
  locale: LocaleCode;
  theme: Theme;
}) {
  const search = previewSearch(locale, theme);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <div dir={dir} className="mx-auto w-full max-w-[1520px] px-5 py-8">
      <Breadcrumb
        items={[
          { label: 'Home' },
          { label: 'Catalogue', to: `/preview/catalogue${search}` },
          ...(parentCrumb ? [{ label: parentCrumb.label, to: parentCrumb.to }] : []),
          { label: categoryName },
        ]}
      />

      {/* Category header — mirrors the storefront (h1 + description). */}
      <header className="mb-6">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{categoryName}</h1>
        {description && <p className="text-muted-foreground mt-2 max-w-2xl">{description}</p>}
      </header>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* Type sidebar — sibling categories as links, current highlighted. */}
        <aside className="border-border bg-card h-fit rounded-lg border p-3.5">
          <h2 className="text-muted-foreground mb-2 px-[11px] text-[0.72rem] font-bold uppercase tracking-wide">
            Type
          </h2>
          <div className="flex flex-col gap-0.5">
            {sidebar.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={item.active ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md px-[11px] py-[9px] text-[0.9rem] leading-snug transition-colors',
                  item.active
                    ? 'bg-primary-soft text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <span>{item.label}</span>
                {item.isDraft && (
                  <span className="bg-warning-soft text-warning rounded px-1.5 py-0.5 text-[10px] font-semibold">
                    Draft
                  </span>
                )}
              </Link>
            ))}
          </div>
        </aside>

        <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 lg:grid-cols-4">
          {products.length === 0 ? (
            <p className="text-muted-foreground col-span-full py-10 text-center text-sm">
              No products in this category yet.
            </p>
          ) : (
            products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                name={resolveName(product, locale)}
                to={`/preview/product/${product.id}${search}`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
