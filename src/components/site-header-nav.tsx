'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Link, usePathname } from '@/i18n/navigation';

const NAV_LINKS = [
  { href: '/', key: 'nav_home' },
  { href: '/catalogue', key: 'nav_catalog' },
  { href: '/about', key: 'nav_about' },
  { href: '/contact', key: 'nav_contact' },
] as const;

// Interactive nav bar (client). Brand comes from admin-managed settings,
// resolved server-side by the `SiteHeader` wrapper and passed in as props.
// `logoUrl` unset → letter fallback from `siteName`.
//
// Tavkil's version also carried a session chip, notification bell, cart, and
// currency switcher. Buyers never sign in here and prices are never public, so
// the only action left is "contact us" — which is also the only conversion path.
export function SiteHeaderNav({
  siteName = 'Tavkil',
  logoUrl = '',
}: {
  siteName?: string;
  logoUrl?: string;
} = {}) {
  const brandName = siteName || 'Tavkil';
  const t = useTranslations('store');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-border bg-background/90 sticky top-0 z-30 border-b backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-[var(--height-nav)] max-w-[var(--width-container)] items-center gap-6 px-5 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          {logoUrl ? (
            // Admin-supplied absolute URL of unknown dimensions; next/image would
            // need a remotePattern per deployment, and the logo is ~32px anyway.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={brandName}
              className="size-8 rounded-[9px] object-cover shadow-[0_6px_14px_-6px_var(--primary)]"
            />
          ) : (
            <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-[9px] text-base font-extrabold shadow-[0_6px_14px_-6px_var(--primary)]">
              {brandName.charAt(0)}
            </span>
          )}
          <span className="text-foreground text-[1.2rem] font-extrabold tracking-tight">
            {brandName}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="ms-1.5 hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative rounded-md px-3.5 py-2 text-[0.94rem] font-medium transition-colors',
                  active
                    ? 'text-primary-ink after:bg-primary after:absolute after:inset-x-3.5 after:bottom-1 after:h-0.5 after:rounded-full'
                    : 'text-foreground-soft hover:bg-background-2 hover:text-foreground',
                )}
              >
                {t(link.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Actions — below lg the secondary controls move into the hamburger
            menu so the bar never crowds. */}
        <div className="flex items-center gap-[9px]">
          <div className="hidden lg:block">
            <LocaleSwitcher />
          </div>
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          <Link href="/contact" className={cn(buttonVariants({ size: 'sm' }))}>
            {t('nav_contact')}
          </Link>

          <IconButton
            className="lg:hidden"
            aria-label={open ? t('menu_close') : t('menu_open')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </IconButton>
        </div>
      </div>

      {/* Mobile / tablet menu (below lg) — nav links plus the controls moved out
          of the bar. */}
      {open && (
        <div className="border-border bg-background border-t lg:hidden">
          <nav className="mx-auto flex max-w-[var(--width-container)] flex-col px-5 py-2 sm:px-6">
            <div className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="border-border-2 text-foreground border-b py-3 text-sm font-medium last:border-0"
                >
                  {t(link.key)}
                </Link>
              ))}
            </div>

            <div className="border-border-2 mt-3 flex flex-wrap items-center gap-2 border-t pt-3.5">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
