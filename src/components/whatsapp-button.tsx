import { WhatsAppIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

/**
 * WhatsApp's exact green, with a white label — the button everyone recognises.
 *
 * It measures 1.98:1, which fails AA text contrast and even the 3:1 non-text
 * graphics need. Two alternatives were built and both rejected on sight: a dark
 * label on the brand green (9.38:1) did not read as WhatsApp, and a deepened
 * green carrying white (#098540, 4.73:1) was worse again. The owner's call, and
 * the same one made for the brand orange — the colour is what identifies the
 * button, so the colour stays.
 *
 * Recorded rather than hidden: GO-LIVE.md carries it, and a11y.spec.ts allows
 * this exact pairing and no other.
 *
 * The link target comes from the caller via `waUrl(settings.whatsappNumber)`, so
 * an unset number → empty href → nothing renders.
 */
const WA_GREEN = '#25D366';
const WA_INK = '#ffffff';

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
    // Prototype `.wa-cta`: solid green, dark label (9.38:1).
    return (
      <a
        {...common}
        style={{ backgroundColor: WA_GREEN, color: WA_INK }}
        className={cn(
          'flex w-full items-center justify-center gap-2.5 rounded-sm px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90',
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
      style={{ '--wa': WA_GREEN, '--wa-ink': WA_INK } as React.CSSProperties}
      className={cn(
        'bg-card grid size-[38px] place-items-center rounded-[8px] border border-[var(--wa)] text-[var(--wa)] transition-colors hover:bg-[var(--wa)] hover:text-[var(--wa-ink)]',
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
      style={{ backgroundColor: WA_GREEN, color: WA_INK }}
      className="wa-fab fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full shadow-[0_10px_24px_-6px_rgba(0,0,0,0.35)] transition-transform hover:scale-110"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
