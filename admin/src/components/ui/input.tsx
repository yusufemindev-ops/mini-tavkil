import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useFieldId } from '@/components/ui/field';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, id, ...props }, ref) => {
    const fieldId = useFieldId();
    return (
      <input
        type={type}
        id={id ?? fieldId}
        ref={ref}
        className={cn(
          'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
