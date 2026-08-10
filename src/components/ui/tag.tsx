import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Faithful port of the prototype `.tag` pill (verified / lock / category).
const tagVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-[9px] py-1 font-mono text-[0.74rem] font-semibold [&_svg]:size-3',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        verified: 'bg-ok/15 text-ok',
        lock: 'bg-primary-soft text-primary-ink',
        category: 'bg-muted text-foreground-soft',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Tag({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof tagVariants>) {
  return <span className={cn(tagVariants({ variant }), className)} {...props} />;
}

export { Tag, tagVariants };
