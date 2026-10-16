import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { RequestAccountView } from '@/features/buyer/request-account-view';
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
    path: '/request',
    title: `${t('rq_title')} · Tavkil`,
    description: t('rq_sub'),
  });
}

export default async function RequestAccountPage({
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
        <Breadcrumb items={[{ label: t('nav_home'), href: '/' }, { label: t('rq_crumb') }]} />
        <RequestAccountView />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
