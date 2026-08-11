import { type TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useFieldId } from '@/components/ui/field';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, id, ...props }, ref) => {
  const fieldId = useFieldId();
  return (
    <textarea
      ref={ref}
      id={id ?? fieldId}
      className={cn(
        'border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-20 w-full resize-y rounded-md border px-3 py-2 text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';
