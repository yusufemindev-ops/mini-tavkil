import type { ElementType, ReactNode } from 'react';

/**
 * Text whose direction follows the text, not the page.
 *
 * The bidi algorithm resolves direction per paragraph, and the paragraph
 * direction comes from the container. Put a Latin string inside `dir="rtl"` and
 * the letters survive — an LTR run stays an LTR run — but every *neutral*
 * character resolves against the container instead of the text. So a trailing
 * full stop lands on the far left, `(2 kg)` gets its brackets mirrored, and
 * `2 mm` renders as `mm 2`.
 *
 * That last one was real: every variant chip on the Arabic product page showed
 * its measurement backwards. The database held `2 mm`; the page displayed
 * `mm 2`, with the digit measurably to the right of the unit.
 *
 * `dir="auto"` fixes it without anyone having to know the string's language.
 * The browser scans for the first *strong* directional character and sets this
 * element's paragraph direction from it — Latin first → LTR, Arabic first → RTL
 * — and the element becomes an isolate, so it cannot bleed into its neighbours.
 *
 * Use this for anything that comes out of the database or from an admin: product
 * names, SKUs, brand names, option labels, addresses. Do NOT use it for UI copy
 * from `messages/{locale}.json`, which is written in the page's own language and
 * should follow the page.
 *
 * Prefer this over `dir="ltr"`. Hard-coding LTR is right only while the value is
 * guaranteed Latin; an option label or a brand name may be Arabic tomorrow, and
 * `auto` is correct in both cases where `ltr` silently becomes the same bug in
 * the other direction.
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
