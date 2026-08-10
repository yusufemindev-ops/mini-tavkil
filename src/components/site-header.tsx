import { getSiteSettings } from '@/lib/settings';
import { SiteHeaderNav } from '@/components/site-header-nav';

// Server wrapper: resolves admin-managed site settings (brand name + logo) on the
// server and hands them to the interactive client nav. Callers keep rendering
// `<SiteHeader />` with no props; getSiteSettings is request-deduped so the
// header, footer, and layout share a single fetch.
export async function SiteHeader() {
  const settings = await getSiteSettings();
  return <SiteHeaderNav siteName={settings.siteName} logoUrl={settings.logoUrl} />;
}
