import type { Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Providers } from '@/components/providers';
import { WhatsAppFab } from '@/components/whatsapp-button';
import { getSiteSettings, waUrl } from '@/lib/settings';
import { IBM_Plex_Sans_Arabic, Inter, JetBrains_Mono } from 'next/font/google';
import '../globals.css';

// Inter for Latin/Turkish text, JetBrains Mono for figures (SKUs, stats), and
// IBM Plex Sans Arabic for the RTL locale.
const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-sans',
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
});

// Tabular figures for SKUs and stats.
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

/**
 * Browser chrome colour.
 *
 * Two values, because a single `theme_color` in the manifest cannot follow the
 * theme toggle: on a phone in dark mode the address bar was painting brand
 * orange over a near-black page. The dark value matches `--background`.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1115' },
  ],
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  const settings = await getSiteSettings();
  const sansVariable = locale === 'ar' ? plexArabic.variable : inter.variable;

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      suppressHydrationWarning
      className={`${sansVariable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
          <WhatsAppFab href={waUrl(settings.whatsappNumber)} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
