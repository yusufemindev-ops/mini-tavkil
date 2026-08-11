'use client';

import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { signIn } from '@/lib/auth-client';

/**
 * Google sign-in button.
 *
 * Uses Google's own mark and their button guidance rather than a brand-orange
 * button: a sign-in control that looks like the identity provider is one people
 * recognise instantly, and Google's branding guidelines ask for it. It also
 * sidesteps the disabled-orange state that made the previous version look broken
 * while redirecting.
 */
export function SignInForm({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const result = await signIn.social({ provider: 'google', callbackURL: next });
      // better-auth resolves with an error object rather than throwing when the
      // server refuses. Without this the button span forever, which is exactly
      // how the sign-in failure showed up.
      if (result?.error) {
        setError(result.error.message ?? 'Could not start sign-in. Please try again.');
        setPending(false);
      }
      // On success the browser navigates to Google; `pending` stays true so the
      // button cannot be double-submitted during the hand-off.
    } catch {
      setError('Could not reach the sign-in service. Check your connection and try again.');
      setPending(false);
    }
  }

  return (
    <div className="mt-7">
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="border-border bg-card text-foreground hover:bg-background-2 focus-visible:ring-ring/50 flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 text-[0.95rem] font-medium transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
        ) : (
          <GoogleMark className="size-5" />
        )}
        {pending ? 'Opening Google…' : 'Continue with Google'}
      </button>

      {error && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive mt-4 rounded-md border p-3 text-sm leading-relaxed"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Google's four-colour mark. Inline SVG is a rule violation everywhere else in
 * this codebase (CLAUDE.md), but lucide ships no brand icons and a monochrome
 * stand-in would misrepresent the provider on the one control where recognising
 * it matters.
 */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.55z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.74H1.71v2.98A11.5 11.5 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.68a6.9 6.9 0 0 1 0-4.4V7.3H1.71a11.5 11.5 0 0 0 0 10.36l3.84-2.98z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.2 15.1 0 12 0 7.52 0 3.65 2.57 1.71 6.31l3.84 2.98C6.46 6.77 9 4.75 12 4.75z"
      />
    </svg>
  );
}
