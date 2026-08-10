import { getTranslations } from 'next-intl/server';
import type { PublicOption } from '@/lib/queries/public-product';

/**
 * The variants a product is available in — colours, sizes, and so on.
 *
 * Tavkil's version was a controlled picker: selecting a value resolved a variant,
 * whose price and SKU drove the buy panel and whose ids were attached to the cart
 * line. There is no cart and no public price here, so a selection has nothing to
 * change — it would be a control that does nothing, which is worse than no control.
 *
 * So this is a read-only display: it tells a buyer what to ask for, and the
 * enquiry form is where they say which one they want. Being a Server Component
 * also means every variant label is in the HTML for crawlers.
 */
export async function ProductOptions({ options }: { options: PublicOption[] }) {
  const visible = options.filter((option) => option.values.length > 0);
  if (visible.length === 0) return null;

  const t = await getTranslations('store');

  return (
    <section className="mt-6" aria-label={t('pd_options')}>
      <dl className="flex flex-col gap-4">
        {visible.map((option) => (
          <div key={option.name}>
            <dt className="text-muted-foreground text-[0.72rem] uppercase tracking-wide">
              {option.name}
            </dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {option.values.map((value) => (
                <span
                  key={value.label}
                  className="border-border bg-card text-foreground-soft inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.82rem]"
                >
                  {value.colorHex && (
                    <span
                      aria-hidden
                      className="border-border size-3.5 rounded-full border"
                      style={{ backgroundColor: value.colorHex }}
                    />
                  )}
                  {value.label}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
