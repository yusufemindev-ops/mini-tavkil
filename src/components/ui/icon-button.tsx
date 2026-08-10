import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Faithful port of the prototype `.icon-btn` — bordered square that turns orange
// on hover. Used for the theme toggle and showcase arrows.
const iconButtonVariants = cva(
  'grid place-items-center rounded-[8px] border border-border bg-card text-foreground-soft transition-colors outline-none hover:border-primary hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[17px]',
  {
    variants: {
      size: {
        default: 'size-[38px]',
        sm: 'size-9',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

function IconButton({
  className,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof iconButtonVariants>) {
  return <ButtonPrimitive className={cn(iconButtonVariants({ size }), className)} {...props} />;
}

export { IconButton, iconButtonVariants };
