import { getTranslations } from 'next-intl/server';
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon } from '@/components/icons';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Link } from '@/i18n/navigation';
import { getSiteSettings, waUrl } from '@/lib/settings';

// Tavkil's footer had a fourth "Account" column (sign in / my orders). Buyers
// never sign in here, so the grid drops to three columns and the catalogue takes
// its place — internal linking is what actually moves SEO (PLAN.md §11).
const COMPANY_LINKS = [
  { href: '/about', key: 'nav_about' },
  { href: '/catalogue', key: 'nav_catalog' },
  { href: '/contact', key: 'foot_contact' },
] as const;

export async function SiteFooter() {
  const t = await getTranslations('store');
  const settings = await getSiteSettings();
  const year = new Date().getFullYear();
  const siteName = settings.siteName || 'Tavkil';

  // Only socials with a configured URL are shown — an empty value means unset.
  const socials = [
    { href: settings.instagramUrl, label: 'Instagram', Icon: InstagramIcon },
    { href: settings.tiktokUrl, label: 'TikTok', Icon: TikTokIcon },
    { href: settings.facebookUrl, label: 'Facebook', Icon: FacebookIcon },
    { href: waUrl(settings.whatsappNumber), label: 'WhatsApp', Icon: WhatsAppIcon },
  ].filter((s) => s.href);

  return (
    <footer className="border-footer-border bg-footer text-footer-foreground mt-auto border-t">
      <div className="mx-auto max-w-[var(--width-container)] px-5 pb-7 pt-[50px] sm:px-6">
        <div className="grid gap-9 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              {settings.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin-supplied absolute URL
                <img
                  src={settings.logoUrl}
                  alt={siteName}
                  className="size-8 rounded-[9px] object-cover"
                />
              ) : (
                <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-[9px] text-base font-extrabold">
                  {siteName.charAt(0)}
                </span>
              )}
              <span className="text-[1.2rem] font-extrabold tracking-tight text-white">
                {siteName}
              </span>
            </Link>
            <p className="mt-4 max-w-[38ch] text-[0.88rem] leading-relaxed">{t('foot_about')}</p>
          </div>

          {/* Follow us — hidden entirely when no social URL is configured, so the
              heading never sits above an empty column. */}
          {socials.length > 0 && (
            <FooterColumn title={t('foot_follow')}>
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener"
                  className="group flex items-center gap-2.5 py-[5px] text-[0.88rem] transition-colors hover:text-white"
                >
                  <Icon className="group-hover:text-primary size-[18px] transition-transform group-hover:scale-110" />
                  {label}
                </a>
              ))}
            </FooterColumn>
          )}

          <FooterColumn title={t('foot_company')}>
            {COMPANY_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="block py-[5px] text-[0.88rem] transition-colors hover:text-white"
              >
                {t(link.key)}
              </Link>
            ))}
          </FooterColumn>
        </div>

        <div className="border-footer-border mt-9 flex flex-wrap items-center justify-between gap-3.5 border-t pt-6 text-[0.82rem]">
          <span>
            © {year} {siteName}. {t('foot_rights')}
          </span>
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-[0.76rem] font-bold uppercase tracking-wider text-white">{title}</h2>
      {children}
    </div>
  );
}
