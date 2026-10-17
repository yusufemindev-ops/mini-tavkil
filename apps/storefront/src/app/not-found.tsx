'use client';

import { useSyncExternalStore } from 'react';
import './globals.css';

/**
 * Root 404 handler for routes outside `[locale]`. Renders full HTML shell and inlined copy.
 */

const COPY = {
  en: {
    title: 'Page not found',
    body: "The page you're looking for doesn't exist or has moved.",
    home: 'Back to home',
    catalogue: 'Browse catalogue',
  },
  tr: {
    title: 'Sayfa bulunamadı',
    body: 'Aradığınız sayfa mevcut değil veya taşınmış.',
    home: 'Ana sayfaya dön',
    catalogue: 'Kataloğu gezin',
  },
  ar: {
    title: 'الصفحة غير موجودة',
    body: 'الصفحة التي تبحث عنها غير موجودة أو نُقلت.',
    home: 'العودة للرئيسية',
    catalogue: 'تصفّح الكتالوج',
  },
} as const;

type Locale = keyof typeof COPY;

/** Infers locale from URL path client-side to prevent hydration mismatch. */
const subscribe = () => () => {};
const readLocale = (): Locale => {
  const first = window.location.pathname.split('/')[1];
  return first in COPY ? (first as Locale) : 'en';
};
const serverLocale = (): Locale => 'en';

export default function NotFound() {
  const locale = useSyncExternalStore(subscribe, readLocale, serverLocale);
  const t = COPY[locale];
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className="h-full">
      <body className="bg-background text-foreground flex min-h-full flex-col antialiased">
        <main
          id="main"
          className="mx-auto flex min-h-screen w-full max-w-[var(--width-container)] flex-col items-center justify-center px-5 py-20 text-center sm:px-6"
        >
          <svg viewBox="0 0 64 64" aria-hidden className="mb-8 size-12">
            <circle cx="32" cy="32" r="32" fill="var(--primary)" />
            <circle
              cx="32"
              cy="32"
              r="24.5"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
              opacity="0.5"
            />
            <path d="M19 23.5h26v9.5h-8v20h-10v-20h-8Z" fill="#fff" />
          </svg>

          <span className="text-primary font-mono text-7xl font-bold sm:text-8xl">404</span>
          <h1 className="text-foreground mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-md">{t.body}</p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href={`/${locale}`}
              className="bg-primary-button text-primary-button-foreground hover:bg-primary-hover inline-flex h-11 items-center rounded-md px-6 text-sm font-medium transition-colors"
            >
              {t.home}
            </a>
            <a
              href={`/${locale}/catalogue`}
              className="border-input text-foreground hover:bg-muted inline-flex h-11 items-center rounded-md border px-6 text-sm font-medium transition-colors"
            >
              {t.catalogue}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
