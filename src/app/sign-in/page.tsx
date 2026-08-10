import type { Metadata } from 'next';
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
    <main className="bg-background flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="border-border bg-card w-full max-w-sm rounded-lg border p-8">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-[9px] text-base font-extrabold">
            T
          </span>
          <span className="text-foreground text-[1.2rem] font-extrabold tracking-tight">
            Tavkil
          </span>
        </div>

        <h1 className="text-foreground mt-6 text-xl font-bold tracking-tight">Staff sign-in</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Admin access only. Sign in with the Google account on the allowlist.
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
      </div>
    </main>
  );
}
