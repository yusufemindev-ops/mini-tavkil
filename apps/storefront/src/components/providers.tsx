'use client';

import { type ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { LocalizedPathsProvider } from '@/components/localized-paths';
import { Toaster } from '@/components/ui/toaster';
import { BuyerProvider } from '@/features/buyer/buyer-context';

// Client-side providers for the storefront shell (theme, localized paths, buyer portal, toast notifications).
export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LocalizedPathsProvider>
        <BuyerProvider>
          {children}
          <Toaster />
        </BuyerProvider>
      </LocalizedPathsProvider>
    </ThemeProvider>
  );
}
