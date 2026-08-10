import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Clock, Globe, Mail, MapPin, MessageCircle } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { buildMetadata } from '@/lib/seo/metadata';
import { getSiteSettings, waUrl } from '@/lib/settings';
import { JsonLd, organizationSchema } from '@/lib/seo/json-ld';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'store' });
  return buildMetadata({
    locale,
    path: '/contact',
    title: `${t('con_title')} · Tavkil`,
    description: t('con_lead'),
  });
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="bg-primary-soft text-primary grid size-10 flex-none place-items-center rounded-[10px]">
        {icon}
      </span>
      <div>
        <div className="text-muted-foreground text-[0.72rem] font-bold uppercase tracking-wide">
          {label}
        </div>
        <div className="text-foreground mt-0.5 text-[0.95rem] font-medium">{value}</div>
      </div>
    </div>
  );
}

// Primary panel. Step 13 replaces this with the real Turnstile-protected form
// that POSTs to /api/contact; until then it routes buyers to email or WhatsApp,
// which is a working conversion path rather than a placeholder. The email CTA and
// address line hide when unset, and the WhatsApp button self-hides on an empty
// href, so an unconfigured site never renders a dead control.
function ContactNote({ email, waHref }: { email: string; waHref: string }) {
  const t = useTranslations('store');
  return (
    <section className="border-border bg-card flex flex-col justify-center rounded-lg border p-7 sm:p-9">
      <span className="bg-primary-soft text-primary grid size-12 place-items-center rounded-xl">
        <MessageCircle className="size-6" />
      </span>
      <h2 className="text-foreground mt-5 text-xl font-bold tracking-tight">{t('con_note_t')}</h2>
      <p className="text-muted-foreground mt-2.5 max-w-prose text-[0.95rem] leading-relaxed">
        {t('con_note_d')}
      </p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {email && (
          <a
            href={`mailto:${email}`}
            className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-2.5 rounded-sm px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            <Mail className="size-[18px]" />
            {t('con_email_cta')}
          </a>
        )}
        <WhatsAppButton href={waHref} variant="full" label={t('con_whatsapp')} />
      </div>
      {email && (
        <p className="text-muted-foreground mt-4 text-[0.82rem]">
          {t('con_email_l')}:{' '}
          <a href={`mailto:${email}`} className="text-primary font-medium hover:underline">
            {email}
          </a>
        </p>
      )}
    </section>
  );
}

function ContactInfo({ email }: { email: string }) {
  const t = useTranslations('store');
  return (
    <aside className="border-border bg-card flex flex-col gap-[18px] rounded-lg border p-[22px]">
      {email && (
        <InfoRow icon={<Mail className="size-[18px]" />} label={t('con_email_l')} value={email} />
      )}
      <InfoRow
        icon={<Clock className="size-[18px]" />}
        label={t('con_resp_l')}
        value={t('con_resp_v')}
      />
      <InfoRow
        icon={<Globe className="size-[18px]" />}
        label={t('con_lang_l')}
        value={t('con_lang_v')}
      />
    </aside>
  );
}

// The map is hidden entirely when there's no configured location; the address
// line only shows when an address is set.
function ContactMap({ mapsEmbedUrl, address }: { mapsEmbedUrl: string; address: string }) {
  const t = useTranslations('store');
  // Only render Google's official embed URLs — never arbitrary src (defence in
  // depth; the backend already validates this on save).
  if (!mapsEmbedUrl.startsWith('https://www.google.com/maps/embed')) return null;
  return (
    <div className="border-border bg-card mt-6 overflow-hidden rounded-lg border">
      <div className="border-border text-foreground flex items-center gap-2.5 border-b px-[18px] py-3.5 font-semibold">
        <MapPin className="text-primary size-[18px]" />
        {t('con_map_h')}
      </div>
      <iframe
        title={t('con_map_h')}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={mapsEmbedUrl}
        className="block h-[360px] w-full border-0"
      />
      {address && (
        <div className="text-foreground-soft px-[18px] py-3.5 text-sm">
          <b className="text-foreground font-semibold">{t('con_address_l')}</b> · {address}
        </div>
      )}
    </div>
  );
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('store');
  const settings = await getSiteSettings();
  const waHref = waUrl(settings.whatsappNumber);

  return (
    <>
      <JsonLd schema={organizationSchema()} />
      <SiteHeader />
      <main className="mx-auto w-full max-w-[var(--width-container)] flex-1 px-5 py-12 sm:px-6">
        <header className="mb-8">
          <Breadcrumb items={[{ label: t('nav_home'), href: '/' }, { label: t('nav_contact') }]} />
          <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
            {t('con_title')}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-lg">{t('con_lead')}</p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
          <ContactNote email={settings.contactEmail} waHref={waHref} />
          <ContactInfo email={settings.contactEmail} />
        </div>

        <ContactMap mapsEmbedUrl={settings.mapsEmbedUrl} address={settings.address} />
      </main>
      <SiteFooter />
    </>
  );
}
