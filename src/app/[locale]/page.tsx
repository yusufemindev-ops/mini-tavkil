import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Container } from '@/components/ui/container';

// Shell-only home page. Step 6 replaces this with the ported tv-showcase /
// about-teaser / cta-panel composition backed by real catalogue data; for now it
// exists so the header, footer, fonts, and RTL can be verified end to end.
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('store');

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Container as="section" className="py-20 sm:py-28">
          <p className="text-primary text-[0.8rem] font-semibold uppercase tracking-wider">
            {t('hero_eyebrow')}
          </p>
          <h1 className="text-foreground mt-4 max-w-[18ch] text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t.rich('hero_h1', { em: (chunks) => <em className="text-primary">{chunks}</em> })}
          </h1>
          <p className="text-foreground-soft mt-5 max-w-[62ch] text-base leading-relaxed">
            {t('hero_lead')}
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
