import { StaffTheme } from '../staff-theme';
import '../globals.css';

// Staff sign-in sits outside `app/[locale]`, so it renders its own <html>.
export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full">
        <StaffTheme>{children}</StaffTheme>
      </body>
    </html>
  );
}
