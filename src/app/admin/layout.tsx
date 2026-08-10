import { StaffTheme } from '../staff-theme';
import '../globals.css';

/**
 * The admin is not a storefront page: no locale segment, no header, no footer, and
 * `lang="en"` regardless of what the visitor's browser prefers. It renders its own
 * <html> because it sits outside `app/[locale]`, which is where the storefront's
 * one lives.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full">
        <StaffTheme>{children}</StaffTheme>
      </body>
    </html>
  );
}
