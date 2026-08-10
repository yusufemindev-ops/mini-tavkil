import { type ElementType, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Centered page container. `wide` uses the catalogue/category width (1380px);
// default is the standard 1240px. Replaces the repeated
// `mx-auto w-full max-w-[...] px-5 sm:px-6` wrapper across pages.
export function Container({
  as: Tag = 'div',
  wide = false,
  className,
  children,
}: {
  as?: ElementType;
  wide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={cn(
        'mx-auto w-full px-5 sm:px-6',
        wide ? 'max-w-[var(--width-container-wide)]' : 'max-w-[var(--width-container)]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
