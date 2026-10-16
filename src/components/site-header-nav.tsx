'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Menu, Package, ShoppingBag, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Link, usePathname } from '@/i18n/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { useBuyer } from '@/features/buyer/buyer-context';

const NAV_LINKS = [
  { href: '/', key: 'nav_home' },
  { href: '/catalogue', key: 'nav_catalog' },
  { href: '/about', key: 'nav_about' },
  { href: '/contact', key: 'nav_contact' },
] as const;

// Interactive storefront navigation bar receiving server-resolved brand settings.
export function SiteHeaderNav({
  siteName = 'Tavkil',
  logoUrl = '',
}: Readonly<{
  siteName?: string;
  logoUrl?: string;
}> = {}) {
  const brandName = siteName || 'Tavkil';
  const t = useTranslations('store');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { buyer, currencies, currency, setCurrency, cart } = useBuyer();

  return (
    <header className="border-border bg-background/90 sticky top-0 z-30 border-b backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-[var(--height-nav)] max-w-[var(--width-container)] items-center gap-6 px-5 sm:px-6">
        <BrandLogo siteName={brandName} logoUrl={logoUrl} onNavigate={() => setOpen(false)} />

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
          {buyer && (
            <Link
              href="/orders"
              aria-current={pathname.startsWith('/orders') ? 'page' : undefined}
              className={cn(
                'relative rounded-md px-3.5 py-2 text-[0.94rem] font-medium transition-colors',
                pathname.startsWith('/orders')
                  ? 'text-primary-ink after:bg-primary after:absolute after:inset-x-3.5 after:bottom-1 after:h-0.5 after:rounded-full'
                  : 'text-foreground-soft hover:bg-background-2 hover:text-foreground',
              )}
            >
              {t('nav_orders')}
            </Link>
          )}
        </nav>

        <div className="flex-1" />

        {/* Actions — below lg the secondary controls move into the hamburger
            menu so the bar never crowds. */}
        <div className="flex items-center gap-[9px]">
          {buyer && currencies.length > 1 && (
            <select
              aria-label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="border-border bg-background-2 text-foreground hidden h-9 rounded-md border px-2.5 font-mono text-xs font-medium lg:block"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          )}

          <div className="hidden lg:block">
            <LocaleSwitcher />
          </div>
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          {buyer ? (
            <>
              <Link
                href="/cart"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'relative gap-1.5',
                )}
              >
                <ShoppingBag className="size-4" />
                <span className="hidden sm:inline">{t('cart_crumb')}</span>
                {cart.totalItems > 0 && (
                  <span className="bg-primary text-primary-foreground ms-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[11px] font-semibold">
                    {cart.totalItems}
                  </span>
                )}
              </Link>
              <Link
                href="/account"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
              >
                <User className="size-4" />
                <span className="hidden sm:inline">{t('nav_profile')}</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'hidden sm:inline-flex',
                )}
              >
                {t('signin')}
              </Link>
              <Link href="/contact" className={cn(buttonVariants({ size: 'sm' }))}>
                {t('nav_contact')}
              </Link>
            </>
          )}

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
              {buyer ? (
                <>
                  <Link
                    href="/orders"
                    onClick={() => setOpen(false)}
                    className="border-border-2 text-foreground flex items-center gap-2 border-b py-3 text-sm font-medium"
                  >
                    <Package className="size-4" />
                    {t('nav_orders')}
                  </Link>
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="border-border-2 text-foreground flex items-center gap-2 border-b py-3 text-sm font-medium last:border-0"
                  >
                    <User className="size-4" />
                    {t('nav_profile')}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="border-border-2 text-foreground border-b py-3 text-sm font-medium"
                  >
                    {t('signin')}
                  </Link>
                  <Link
                    href="/request"
                    onClick={() => setOpen(false)}
                    className="border-border-2 text-foreground border-b py-3 text-sm font-medium last:border-0"
                  >
                    {t('request')}
                  </Link>
                </>
              )}
            </div>

            <div className="border-border-2 mt-3 flex flex-wrap items-center gap-2 border-t pt-3.5">
              {buyer && currencies.length > 1 && (
                <select
                  aria-label="Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="border-border bg-background-2 text-foreground h-9 rounded-md border px-2.5 font-mono text-xs font-medium"
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              )}
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
