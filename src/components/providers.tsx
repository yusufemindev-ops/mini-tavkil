'use client';

import { type ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { LocalizedPathsProvider } from '@/components/localized-paths';

// Client-side providers for the storefront shell (theme, localized paths, toast notifications).
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
