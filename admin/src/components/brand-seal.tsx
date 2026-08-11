import { cn } from '@/lib/utils';

/**
 * The Tavkil seal, matching the storefront's mark.
 *
 * Kept as its own component because the admin had the old square-with-a-T
 * hand-written in two places — the sidebar and the sign-in page — which is how
 * they came to disagree with the storefront the moment the brand changed. One
 * definition, both call sites.
 *
 * The shape and reasoning live in src/components/brand-logo.tsx: tavkil means
 * delegation, a tevkil is granted by a sealed document, and the ring sits inside
 * the disc so the silhouette stays a clean circle when it is small.
 *
 * Drawn rather than imported from the storefront: the admin is a separate Vite
 * app with its own bundle, and a shared module across that boundary needs a
 * build step neither side wants. That is the same reason vendor/icons exists.
 */
export function BrandSeal({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('text-primary-foreground', className)}
      aria-hidden
      focusable="false"
    >
      <circle cx="32" cy="32" r="32" className="fill-primary" />
      <circle
        cx="32"
        cy="32"
        r="24.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.5"
      />
      <path d="M19 23.5h26v9.5h-8v20h-10v-20h-8Z" fill="currentColor" />
    </svg>
  );
}
