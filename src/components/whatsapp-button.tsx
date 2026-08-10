import { WhatsAppIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

// Brand green. The link target is supplied by the caller (built via
// `waUrl(settings.whatsappNumber)`), so an unset number → empty href → nothing
// renders.
const WA_GREEN = '#25D366';

// Reusable WhatsApp link. `icon` = bordered square for the header; `full` = the
// labelled green button used on the contact page. Renders nothing when `href` is
// empty so an unset WhatsApp number never produces a broken link.
export function WhatsAppButton({
  href,
  variant = 'icon',
  label,
  className,
}: {
  href: string;
  variant?: 'icon' | 'full';
  label?: string;
  className?: string;
}) {
  if (!href) return null;

  const common = { href, target: '_blank', rel: 'noopener' as const };

  if (variant === 'full') {
    // Prototype `.wa-cta`: solid green, white text.
    return (
      <a
        {...common}
        style={{ backgroundColor: WA_GREEN }}
        className={cn(
          'flex w-full items-center justify-center gap-2.5 rounded-sm px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90',
          className,
        )}
      >
        <WhatsAppIcon className="size-[18px]" />
        {label}
      </a>
    );
  }

  // Prototype `.wa-btn`: green icon + green border, fills green on hover.
  return (
    <a
      {...common}
      aria-label="WhatsApp"
      style={{ '--wa': WA_GREEN } as React.CSSProperties}
      className={cn(
        'bg-card grid size-[38px] place-items-center rounded-[8px] border border-[var(--wa)] text-[var(--wa)] transition-colors hover:bg-[var(--wa)] hover:text-white',
        className,
      )}
    >
      <WhatsAppIcon className="size-[17px]" />
    </a>
  );
}

// Floating circular WhatsApp button, parked bottom-right (mirrors the dev FABs
// on the bottom-left). Solid brand green, lifts on hover. Mounted once in the
// root layout so it follows the buyer across pages.
export function WhatsAppFab({ href }: { href: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label="WhatsApp"
      title="WhatsApp"
      style={{ backgroundColor: WA_GREEN }}
      className="wa-fab fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full text-white shadow-[0_10px_24px_-6px_rgba(0,0,0,0.35)] transition-transform hover:scale-110"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
