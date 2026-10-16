import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { OrderDetailView } from '@/features/buyer/order-detail-view';
import { buildMetadata } from '@/lib/seo/metadata';

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ locale: string; ref: string }>;
}>): Promise<Metadata> {
  const { locale, ref } = await params;
  const t = await getTranslations({ locale, namespace: 'store' });
  return buildMetadata({
    locale,
    path: `/orders/${encodeURIComponent(ref)}`,
    title: `${ref} · ${t('ord_title')} · Tavkil`,
    description: t('ord_lead'),
  });
}

export default async function BuyerOrderDetailPage({
  params,
}: Readonly<{
  params: Promise<{ locale: string; ref: string }>;
}>) {
  const { locale, ref } = await params;
  const t = await getTranslations({ locale, namespace: 'store' });

  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-[var(--width-container)] flex-1 px-5 py-10 sm:px-6"
      >
        <Breadcrumb
          items={[
            { label: t('nav_home'), href: '/' },
            { label: t('ord_title'), href: '/orders' },
            { label: ref },
          ]}
        />
        <OrderDetailView orderNumber={ref} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
