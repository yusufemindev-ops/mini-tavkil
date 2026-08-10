'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';

/**
 * Theme provider for the staff pages (`/sign-in`, `/admin`).
 *
 * They sit outside `app/[locale]`, so they don't get the storefront's `Providers`.
 * Without this they render light while the storefront follows the system setting —
 * a white flash on the way from a dark storefront into the admin.
 *
 * Deliberately narrower than the storefront's `Providers`: no toaster, no localized
 * paths, no i18n. Staff pages are English-only.
 */
export function StaffTheme({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
