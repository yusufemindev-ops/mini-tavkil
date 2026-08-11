'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('store');
  return (
    <main
      id="main"
      className="mx-auto flex min-h-[70vh] w-full max-w-[var(--width-container)] flex-col items-center justify-center px-5 py-20 text-center sm:px-6"
    >
      <span className="text-primary font-mono text-7xl font-bold sm:text-8xl">404</span>
      <h1 className="text-foreground mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
        {t('nf_title')}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md">{t('nf_d')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={cn(buttonVariants({ size: 'lg' }))}>
          {t('nf_home')}
        </Link>
        <Link href="/catalogue" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
          {t('nf_cat')}
        </Link>
      </div>
    </main>
  );
}
