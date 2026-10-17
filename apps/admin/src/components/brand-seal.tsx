import { cn } from '@/lib/utils';

/** SVG brand seal mark used in admin sidebar and authentication pages. */
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
