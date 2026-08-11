import type { Metadata } from 'next';
import Link from 'next/link';
import { SignInForm } from './sign-in-form';

/**
 * Staff sign-in. Deliberately outside `[locale]`: it is not a storefront page, it
 * is not translated (three admins, all of whom read English), and step 9 mounts the
 * admin SPA across all of `/admin`, so keeping this at the root leaves that space
 * free.
 */
export const metadata: Metadata = {
  title: 'Sign in · Tavkil',
  // Never indexable, on any deployment, regardless of SITE_INDEXABLE.
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  // Only ever redirect to a path on this origin. Taking `next` at face value would
  // be an open redirect: /sign-in?next=https://evil.example lands a signed-in admin
  // on an attacker's page carrying whatever the referrer leaks.
  const target = next && /^\/[^/\\]/.test(next) ? next : '/admin';

  return (
    <main className="bg-background-2 relative flex min-h-dvh items-center justify-center px-5 py-12">
      {/* A soft brand wash so the page reads as ours rather than as a bare form. */}
      <div
        aria-hidden
        className="from-primary-soft/60 pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b to-transparent"
      />

      <div className="border-border bg-card shadow-card relative w-full max-w-[400px] rounded-xl border p-8 sm:p-10">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-[10px] text-base font-extrabold shadow-[0_6px_14px_-6px_var(--primary)]">
            T
          </span>
          <span className="text-foreground text-[1.25rem] font-extrabold tracking-tight">
            Tavkil
          </span>
        </div>

        <h1 className="text-foreground mt-8 text-[1.4rem] font-bold tracking-tight">
          Staff sign-in
        </h1>
        <p className="text-muted-foreground mt-2 text-[0.92rem] leading-relaxed">
          This is the admin for tavkil.com. Access is limited to allowlisted Google accounts.
        </p>

        {error === 'not-allowed' && (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive mt-5 rounded-sm border p-3 text-sm"
          >
            That Google account is not on the admin allowlist. Ask an owner to add it, then sign in
            again.
          </p>
        )}

        <SignInForm next={target} />

        <p className="border-border text-muted-foreground mt-8 border-t pt-5 text-[0.8rem] leading-relaxed">
          Looking for the catalogue?{' '}
          <Link href="/en" className="text-primary font-medium hover:underline">
            Go to the storefront
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
