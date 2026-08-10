import { type ComponentProps, type ReactNode, createContext, useContext, useId } from 'react';
import { cn } from '@/lib/utils';

// A Field provides a generated id to its label + control via context, so
// `<Field><FieldLabel/><Input/></Field>` auto-associates (clickable label, AT
// announces it) with no per-consumer wiring. Explicit `htmlFor`/`id` still win.
const FieldIdContext = createContext<string | undefined>(undefined);

export function useFieldId(): string | undefined {
  return useContext(FieldIdContext);
}

export function Field({ className, children, ...props }: ComponentProps<'div'>) {
  const id = useId();
  return (
    <FieldIdContext.Provider value={id}>
      <div className={cn('mb-4', className)} {...props}>
        {children}
      </div>
    </FieldIdContext.Provider>
  );
}

export function FieldLabel({
  required,
  info,
  children,
  className,
  htmlFor,
  ...props
}: ComponentProps<'label'> & { required?: boolean; info?: ReactNode }) {
  const fieldId = useFieldId();
  return (
    <label
      htmlFor={htmlFor ?? fieldId}
      className={cn('text-foreground mb-1.5 block text-xs font-semibold', className)}
      {...props}
    >
      {children}
      {required && <span className="text-destructive ms-0.5">*</span>}
      {info}
    </label>
  );
}

export function FieldHelp({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-muted-foreground mt-1 text-[11.5px]', className)} {...props} />;
}

export function FieldError({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-destructive mt-1 text-xs', className)}>{children}</p>;
}

export function FormRow({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('grid grid-cols-1 gap-3.5 sm:grid-cols-2', className)} {...props} />;
}

export function FormRow3({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('grid grid-cols-1 gap-3.5 sm:grid-cols-3', className)} {...props} />;
}
