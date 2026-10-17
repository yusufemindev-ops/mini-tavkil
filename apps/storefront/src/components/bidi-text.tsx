import type { ElementType, ReactNode } from 'react';

/**
 * Renders dynamic content (product names, SKUs, option labels) with `dir="auto"`
 * to resolve base text direction from content rather than inherited page direction.
 */
export function BidiText<T extends ElementType = 'span'>({
  as,
  children,
  ...rest
}: { as?: T; children: ReactNode } & Omit<
  React.ComponentPropsWithoutRef<T>,
  'as' | 'children' | 'dir'
>) {
  const Tag = (as ?? 'span') as ElementType;
  return (
    <Tag dir="auto" {...rest}>
      {children}
    </Tag>
  );
}
