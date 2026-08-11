import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Faithful port of the prototype `.btn` system (storefrontv2.1.html):
// accent (default) carries the orange glow, ink is the near-black button, and
// light/line are the inverted variants used on dark CTA panels.
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm border border-transparent text-[0.94rem] font-semibold leading-none transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_6px_16px_-8px_var(--primary)] hover:bg-primary-hover hover:shadow-[0_12px_22px_-8px_var(--primary)]',
        ink: 'bg-foreground text-background hover:shadow-card',
        outline: 'border-border bg-card text-foreground hover:border-foreground',
        ghost: 'px-3 text-foreground-soft hover:text-foreground',
        // A fixed shade rather than a token: this variant sits on the always-orange
        // CTA panel in both themes, and --primary-ink flips to pale peach in dark
        // mode. The value is the light-mode --primary-ink, so it is the same brand
        // orange Tavkil uses here — just the text-safe shade of it (4.79:1 on
        // white, where the brand #f2640c is 3.18:1 and fails AA for a button label).
        light: 'bg-white text-[#c24e06] hover:bg-footer hover:text-white',
        line: 'border-white/50 bg-transparent text-white hover:bg-white/15',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20',
        link: 'text-primary-ink underline-offset-4 hover:underline',
      },
      size: {
        default: 'px-5 py-[13px]',
        sm: 'px-3.5 py-2 text-sm',
        lg: 'px-[26px] py-4 text-base',
        icon: 'size-[38px] p-0',
        // shadcn's dialog close affordance sizes itself with this.
        'icon-sm': 'size-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
