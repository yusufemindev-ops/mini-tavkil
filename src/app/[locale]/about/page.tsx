import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Kicker } from '@/components/ui/section-heading';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { CountUp } from '@/components/home/count-up';
import { CtaPanel } from '@/components/home/cta-panel';
import { buildMetadata } from '@/lib/seo/metadata';
import { routing } from '@/i18n/routing';
import { publicCategories, publicProductCount, type Locale } from '@/lib/queries/public-product';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'store' });
  return buildMetadata({
    locale,
    path: '/about',
    title: `${t('ab_title')} · Tavkil`,
    description: t('ab_lead'),
  });
}

const CONTAINER = 'mx-auto w-full max-w-[var(--width-container)] px-5 sm:px-6';

const PRINCIPLES = [
  { titleKey: 'pr1_t', bodyKey: 'pr1_d' },
  { titleKey: 'pr2_t', bodyKey: 'pr2_d' },
  { titleKey: 'pr3_t', bodyKey: 'pr3_d' },
] as const;

type AboutStat = { value: number; suffix: string; labelKey: string };

function AboutContent({ stats }: { stats: AboutStat[] }) {
  const t = useTranslations('store');
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="py-12 sm:py-16">
        <div className={CONTAINER}>
          <Breadcrumb items={[{ label: t('nav_home'), href: '/' }, { label: t('nav_about') }]} />
          <Kicker className="mb-4">{t('ab_kicker')}</Kicker>
          <h1 className="text-foreground max-w-[17ch] text-[clamp(2.3rem,5vw,3.7rem)] font-extrabold leading-[1.05] tracking-tight">
            {t('ab_title')}
          </h1>
          <p className="text-foreground-soft mt-4 max-w-[58ch] text-[clamp(1.1rem,1.6vw,1.32rem)] leading-relaxed">
            {t('ab_lead')}
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-background-2 py-14 sm:py-20">
        <div
          className={`${CONTAINER} grid items-start gap-[clamp(28px,4vw,56px)] lg:grid-cols-[0.9fr_1.1fr]`}
        >
          <div>
            <Kicker>{t('ab_mission_k')}</Kicker>
            <h2 className="text-foreground mt-3 text-[clamp(1.6rem,2.6vw,2.2rem)] font-bold tracking-tight">
              {t('ab_mission_h')}
            </h2>
          </div>
          <div className="text-foreground-soft space-y-3.5 leading-relaxed">
            <p>{t('ab_mission_p1')}</p>
            <p>{t('ab_mission_p2')}</p>
          </div>
        </div>
      </section>

      {/* Corridor + stats */}
      <section className="py-14 sm:py-20">
        <div
          className={`${CONTAINER} grid items-start gap-[clamp(28px,4vw,56px)] lg:grid-cols-[0.9fr_1.1fr]`}
        >
          <div>
            <Kicker>{t('ab_corridor_k')}</Kicker>
            <h2 className="text-foreground mt-3 text-[clamp(1.6rem,2.6vw,2.2rem)] font-bold tracking-tight">
              {t('ab_corridor_h')}
            </h2>
            <p className="text-foreground-soft mt-3.5 leading-relaxed">{t('ab_corridor_p')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.labelKey}
                className="border-border bg-card hover:border-primary rounded-lg border p-[22px] transition-colors"
              >
                <div dir="ltr" className="text-primary font-mono text-[1.9rem] font-semibold">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-muted-foreground mt-1 text-[0.82rem]">{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-background-2 py-14 sm:py-20">
        <div className={CONTAINER}>
          <Kicker>{t('ab_pr_k')}</Kicker>
          <h2 className="text-foreground mb-6 mt-3 max-w-[20ch] text-[clamp(1.6rem,2.6vw,2.2rem)] font-bold tracking-tight">
            {t('ab_pr_h')}
          </h2>
          <div className="grid gap-3.5">
            {PRINCIPLES.map((principle, index) => (
              <div
                key={principle.titleKey}
                className="border-border bg-card hover:border-primary group grid grid-cols-[auto_1fr] gap-[18px] rounded-lg border p-[22px] transition-colors"
              >
                <span className="bg-primary-soft text-primary group-hover:bg-primary grid size-11 place-items-center rounded-lg font-mono text-lg font-semibold transition-colors group-hover:text-white">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-foreground mb-[7px] text-base font-semibold">
                    {t(principle.titleKey)}
                  </h3>
                  <p className="text-foreground-soft text-[0.95rem] leading-relaxed">
                    {t(principle.bodyKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaPanel />
    </main>
  );
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  /*
   * Tavkil's about page hard-coded six stat cards: 340+ suppliers, 38 countries,
   * 48h onboarding, 0% markup. Every one of those was invented, and two of them
   * (supplier count, markup) are claims this project has no way to stand behind —
   * a supplier count is admin-only data and there is no public price to mark up.
   *
   * These three are counted from the database, so the page can't drift from the
   * catalogue and can't overstate it.
   */
  const [categories, productCount] = await Promise.all([
    publicCategories(locale as Locale),
    publicProductCount({}, locale as Locale),
  ]);

  const stats: AboutStat[] = [
    {
      value: categories.filter((category) => category.parent === null).length,
      suffix: '',
      labelKey: 'ab_st_sectors',
    },
    { value: productCount, suffix: '', labelKey: 'stat_skus' },
    { value: routing.locales.length, suffix: '', labelKey: 'ab_st_langs' },
  ];

  return (
    <>
      <SiteHeader />
      <AboutContent stats={stats} />
      <SiteFooter />
    </>
  );
}
