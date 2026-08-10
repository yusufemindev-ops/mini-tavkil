import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// Placeholder for the Cloudflare Turnstile widget (architecture: Account Request
// + Contact form). Swap for the real widget once the site key is wired.
export function Captcha({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn(
        'border-border text-muted-foreground flex items-center gap-2.5 rounded-sm border border-dashed px-3.5 py-3.5 text-[0.85rem]',
        className,
      )}
    >
      <ShieldCheck className="size-4 flex-none" />
      {label}
    </div>
  );
}
