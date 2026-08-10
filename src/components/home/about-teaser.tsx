import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Kicker } from '@/components/ui/section-heading';
import { Reveal } from '@/components/ui/reveal';
import { Tag } from '@/components/ui/tag';
import { Thumb } from '@/components/catalog/thumb';
import { CheckIcon } from '@/components/icons';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// Prototype "about teaser" (#page-home `.teaser`): a visual card beside a copy
// block with a checklist and an ink CTA to the about page.
export function AboutTeaser() {
  const t = useTranslations('store');
  return (
    <section className="bg-background-2">
      <Reveal className="mx-auto grid max-w-[var(--width-container)] items-center gap-10 px-5 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
        {/* Visual card */}
        <article className="border-border bg-card shadow-card overflow-hidden rounded-lg border">
          <div className="relative">
            <Thumb className="aspect-[16/10]" />
            <Tag variant="verified" className="absolute start-3 top-3">
              <CheckIcon className="size-3" /> {t('verified')}
            </Tag>
            <span className="absolute bottom-3 end-3 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[0.7rem] font-semibold text-white">
              İzmir · Bursa · Gaziantep
            </span>
          </div>
          <div className="px-[18px] py-4">
            <div className="text-muted-foreground font-mono text-[0.68rem]">{t('at_card_k')}</div>
            <h3 className="text-foreground mt-1 text-[1.05rem] font-semibold">{t('at_card_t')}</h3>
          </div>
        </article>

        {/* Copy */}
        <div>
          <Kicker>{t('at_kicker')}</Kicker>
          <h2 className="text-foreground mt-3.5 text-2xl font-bold tracking-tight sm:text-3xl">
            {t('at_h')}
          </h2>
          <p className="text-foreground-soft mt-3.5 leading-relaxed">{t('at_p1')}</p>
          <ul className="my-5 grid gap-2.5">
            {['at_l1', 'at_l2', 'at_l3'].map((key) => (
              <li
                key={key}
                className="text-foreground-soft flex items-start gap-2.5 text-[0.95rem]"
              >
                <CheckIcon className="text-ok mt-0.5 size-[18px] flex-none" strokeWidth={2.6} />
                {t(key)}
              </li>
            ))}
          </ul>
          <Link href="/about" className={cn(buttonVariants({ variant: 'ink' }))}>
            {t('at_link')}
            <ArrowRight className="rtl:rotate-180" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
