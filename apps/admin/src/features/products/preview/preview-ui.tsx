import { ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

// Small presentational bits shared by the preview grid + detail views.

interface BreadcrumbItem {
  label: string;
  // When set, the crumb links there (e.g. the sub-category → its grid preview).
  // Home/Catalogue and the current page are plain text.
  to?: string;
}

export function Breadcrumb({ items }: { items: readonly BreadcrumbItem[] }) {
  return (
    <nav className="text-muted-foreground mb-6 flex flex-wrap items-center gap-1.5 text-[13px]">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 rtl:rotate-180" />}
            {item.to ? (
              <Link to={item.to} className="hover:text-foreground min-w-0 truncate">
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast ? 'text-foreground min-w-0 truncate' : 'text-muted-foreground',
                )}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// Product image with a grey fallback for the (common in draft) no-image case.
export function ProductImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return <div className={cn('bg-muted', className)} aria-hidden />;
  }
  return <img src={src} alt={alt} className={cn('object-cover', className)} />;
}

// Sub-category tile image: the uploaded tile image over a tinted-orange gradient,
// or just the gradient when there's no image (mirrors the storefront Thumb). If
// the image fails to load it's removed, leaving the gradient.
export function CategoryThumb({ src, className }: { src: string | null; className?: string }) {
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        background:
          'radial-gradient(circle at 30% 22%, color-mix(in srgb, var(--primary) 42%, var(--muted)), var(--muted))',
      }}
      aria-hidden={!src}
    >
      {src && (
        <img
          src={src}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={(e) => e.currentTarget.remove()}
        />
      )}
    </div>
  );
}

export function PreviewLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="text-muted-foreground size-6 animate-spin" />
    </div>
  );
}

export function PreviewMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground flex min-h-[50vh] items-center justify-center">
      {children}
    </div>
  );
}
