import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/section-heading';
import { Reveal } from '@/components/ui/reveal';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { TvShowcase, type ShowcaseChannel } from '@/components/home/tv-showcase';
import { StepCard, Steps } from '@/components/home/step-card';
import { AboutTeaser } from '@/components/home/about-teaser';
import { CtaPanel } from '@/components/home/cta-panel';
import { CategoryTile } from '@/components/catalog/category-tile';
import { ProductCard } from '@/components/catalog/product-card';
import { Link } from '@/i18n/navigation';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd, organizationSchema, websiteSchema } from '@/lib/seo/json-ld';
import {
  publicCategories,
  publicProducts,
  type Locale,
  type PublicCategory,
  type PublicProduct,
} from '@/lib/queries/public-product';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo.home' });
  return buildMetadata({ locale, path: '', title: t('title'), description: t('description') });
}

function Hero({ channels }: { channels: ShowcaseChannel[] }) {
  const t = useTranslations('store');
  return (
    <section className="border-border/60 relative overflow-hidden border-b">
      <div
        aria-hidden
        className="from-primary-soft/50 pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b to-transparent"
      />
      <div className="mx-auto grid max-w-[var(--width-container)] gap-12 px-5 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="flex flex-col justify-center">
          <span className="border-border bg-background/70 text-muted-foreground inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
            <span className="bg-primary size-1.5 rounded-full" />
            {t('hero_eyebrow')}
          </span>
          <h1 className="text-foreground mt-6 text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            {t.rich('hero_h1', {
              em: (chunks) => <em className="text-primary not-italic">{chunks}</em>,
            })}
          </h1>
          <p className="text-muted-foreground mt-6 max-w-xl text-pretty text-lg leading-relaxed">
            {t('hero_lead')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/catalogue" className={cn(buttonVariants({ size: 'lg' }))}>
              {t('cta_browse')}
              <ArrowRight className="rtl:rotate-180" aria-hidden />
            </Link>
            {/* Was /request — buyer account signup, which no longer exists. */}
            <Link
              href="/contact"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
            >
              {t('cta_contact')}
            </Link>
          </div>
          <ul className="text-foreground-soft mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {['ht1', 'ht2', 'ht3'].map((key) => (
              <li key={key} className="inline-flex items-center gap-1.5">
                <BadgeCheck className="text-ok size-4" aria-hidden />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <TvShowcase channels={channels} />
      </div>
    </section>
  );
}

const STEPS = [
  { num: 1, titleKey: 's1_t', bodyKey: 's1_d' },
  { num: 2, titleKey: 's2_t', bodyKey: 's2_d' },
  { num: 3, titleKey: 's3_t', bodyKey: 's3_d' },
] as const;

function HowItWorks() {
  const t = useTranslations('store');
  return (
    <section className="mx-auto max-w-[var(--width-container)] px-5 py-16 sm:px-6 lg:py-20">
      <Reveal>
        <SectionHeading kicker={t('how_kicker')} title={t('how_h2')} />
      </Reveal>
      <Reveal>
        <Steps>
          {STEPS.map((step, i) => (
            <StepCard
              key={step.num}
              number={step.num}
              title={t(step.titleKey)}
              body={t(step.bodyKey)}
              connector={i < STEPS.length - 1}
            />
          ))}
        </Steps>
      </Reveal>
    </section>
  );
}

// Tavkil hid its Sectors and Premium-suppliers sections behind TSC-62 because
// they showed invented counts. These render real rows, and they are what makes
// every product reachable in ~3 clicks from the homepage (PLAN.md §11).
function Sectors({ categories }: { categories: PublicCategory[] }) {
  const t = useTranslations('store');
  if (categories.length === 0) return null;
  return (
    <section className="mx-auto max-w-[var(--width-container)] px-5 py-16 sm:px-6 lg:py-20">
      <Reveal>
        <SectionHeading
          kicker={t('sec_kicker')}
          title={t('sec_h2')}
          viewAll={{ href: '/catalogue', label: t('view_all') }}
        />
      </Reveal>
      <Reveal stagger className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <CategoryTile key={category.id} category={category} />
        ))}
      </Reveal>
    </section>
  );
}

function FeaturedProducts({ products }: { products: PublicProduct[] }) {
  const t = useTranslations('store');
  if (products.length === 0) return null;
  return (
    <section className="bg-background-2">
      <div className="mx-auto max-w-[var(--width-container)] px-5 py-16 sm:px-6 lg:py-20">
        <Reveal>
          <SectionHeading
            kicker={t('feat_kicker')}
            title={t('feat_h2')}
            viewAll={{ href: '/catalogue', label: t('view_all') }}
          />
        </Reveal>
        <Reveal stagger className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [categories, featured] = await Promise.all([
    publicCategories(locale as Locale),
    publicProducts({ featured: true, limit: 8 }, locale as Locale),
  ]);

  const roots = categories.filter((category) => category.parent === null);

  // A channel needs a picture. Use the category's own image, else the first image
  // of one of its products, so the showcase is never a row of blank gradients.
  const channels: ShowcaseChannel[] = await Promise.all(
    roots.slice(0, 6).map(async (category) => {
      if (category.imageUrl) {
        return { slug: category.slug, name: category.name, imageUrl: category.imageUrl };
      }
      const [product] = await publicProducts(
        { category: category.slug, includeDescendants: true, limit: 1 },
        locale as Locale,
      );
      return {
        slug: category.slug,
        name: category.name,
        imageUrl: product?.images[0]?.url ?? null,
      };
    }),
  );

  return (
    <>
      <JsonLd schema={[organizationSchema(), websiteSchema(locale)]} />
      <SiteHeader />
      <main className="flex-1">
        <Hero channels={channels} />
        <Sectors categories={roots} />
        <FeaturedProducts products={featured} />
        <HowItWorks />
        <AboutTeaser />
        <CtaPanel />
      </main>
      <SiteFooter />
    </>
  );
}
