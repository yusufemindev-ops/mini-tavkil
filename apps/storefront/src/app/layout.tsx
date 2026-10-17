// The real <html> element is rendered by app/[locale]/layout.tsx, which is the
// only place that knows the locale (and therefore `lang` and `dir`). This root
// layout exists solely because Next requires one.
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return children;
}
