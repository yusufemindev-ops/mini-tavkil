import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { CartView } from '@/features/buyer/cart-view';
import { buildMetadata } from '@/lib/seo/metadata';

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'store' });
  return buildMetadata({
    locale,
    path: '/cart',
    title: `${t('cart_title')} · Tavkil`,
    description: t('cart_lead'),
    index: false,
  });
}

export default async function BuyerCartPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'store' });

  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-[var(--width-container)] flex-1 px-5 py-10 sm:px-6"
      >
        <Breadcrumb items={[{ label: t('nav_home'), href: '/' }, { label: t('cart_crumb') }]} />
        <CartView />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
