import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Kicker } from '@/components/ui/section-heading';
import { Reveal } from '@/components/ui/reveal';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

// Prototype `.cta` — orange gradient panel with a dotted overlay and two inverted
// buttons (light + line). Shared by the home and about pages.
//
// The gradient is fixed rather than token-driven: this panel carries white text
// in both themes, and the dark theme's brighter --primary would put that white at
// 2.61:1. These two shades keep white above 4.5:1 whichever theme is active.
//
// The primary button pointed at /request (buyer account signup), which no longer
// exists. The one conversion path here is the contact form.
export function CtaPanel() {
  const t = useTranslations('store');
  return (
    <section className="mx-auto max-w-[var(--width-container)] px-5 py-14 sm:px-6">
      <Reveal className="relative overflow-hidden rounded-lg bg-[linear-gradient(120deg,#a8420a,#c24e06)] px-8 py-12 sm:px-12 sm:py-14">
        {/* dotted overlay */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(80%_130%_at_100%_0%,#000,transparent_70%)]"
          style={{
            background:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,.16) 1px, transparent 1.6px) 0 0 / 22px 22px',
          }}
        />
        <div className="relative">
          <Kicker tone="onDark">{t('cta_kicker')}</Kicker>
          <h2 className="mt-3.5 max-w-[20ch] text-2xl font-bold tracking-tight text-white sm:text-4xl">
            {t('cta_h2')}
          </h2>
          <p className="mt-3 max-w-[52ch] text-[1.05rem] text-white/90">{t('cta_lead')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className={cn(buttonVariants({ variant: 'light', size: 'lg' }))}>
              {t('cta_contact')}
            </Link>
            <Link href="/catalogue" className={cn(buttonVariants({ variant: 'line', size: 'lg' }))}>
              {t('cta_browse')}
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
