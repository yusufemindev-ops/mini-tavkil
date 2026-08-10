'use client';

import { type ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { LocalizedPathsProvider } from '@/components/localized-paths';

// Client-side providers for the storefront shell.
//
// Deliberately thin compared with Tavkil's: there is no buyer sign-in, no cart,
// and no currency switcher here, and public pages are Server Components fetching
// from the database directly — so no TanStack Query and no MSW. Adding a query
// client back on an indexable page is a rule violation, not a preference
// (CLAUDE.md §4).
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LocalizedPathsProvider>
        {children}
        <Toaster />
      </LocalizedPathsProvider>
    </ThemeProvider>
  );
}
