import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { Link } from '@/i18n/navigation';
import { getSiteSettings, waUrl } from '@/lib/settings';

/**
 * What replaces Tavkil's buy panel.
 *
 * Tavkil's showed a tier price (or a sign-in lock), the supplier, and an
 * add-to-request button. None of those exist here — no public price, no supplier
 * on any public surface, no cart. The single conversion path is the contact form,
 * so this panel states the order terms a buyer needs, then routes them there with
 * the product already identified.
 *
 * A Server Component: nothing here is interactive, and the CTA carries the product
 * in the URL rather than in client state.
 */
export async function ProductEnquiryPanel({
  slug,
  name,
  moq,
  unit,
  packSize,
}: {
  slug: string;
  name: string;
  moq: number;
  unit: string;
  packSize: number | null;
}) {
  const t = await getTranslations('store');
  const settings = await getSiteSettings();
  const whatsapp = waUrl(settings.whatsappNumber);

  // "(N pcs)" when a sellable unit bundles several items.
  const packSuffix = packSize && packSize > 1 ? ` (${t('pd_pack_pcs', { count: packSize })})` : '';

  return (
    <section className="border-border bg-card mt-6 rounded-lg border p-5">
      <p className="text-muted-foreground text-sm">
        {t('pd_moq_note')}{' '}
        {/* Without a direction of its own, bidi reorders "12 L" to "L 12" inside
            an Arabic sentence — which reads as a different value. `auto` takes the
            direction from the string rather than assuming Latin, and makes the
            element an isolate, so it cannot disturb the sentence around it. */}
        <b dir="auto" className="text-foreground font-mono">
          {moq} {unit}
          {packSuffix}
        </b>
      </p>

      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{t('pd_quote_d')}</p>

      <div className="mt-5 flex flex-col gap-2.5">
        <Link
          // The contact form reads these and prefills its message, so a buyer
          // never has to describe which product they mean.
          href={{ pathname: '/contact', query: { product: slug, name } }}
          className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
        >
          {t('pd_quote_cta')}
          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
        </Link>
        {whatsapp && <WhatsAppButton href={whatsapp} variant="full" label={t('pd_whatsapp')} />}
      </div>
    </section>
  );
}
