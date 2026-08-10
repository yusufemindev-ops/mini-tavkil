import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdmin, permissionsFor } from '@/lib/auth-guard';
import { SignOutButton } from './sign-out-button';

/**
 * Interim admin landing. Step 9 replaces this with Tavkil's Vite SPA, built and
 * served under `/admin`; what stays is the guard.
 *
 * Note this runs `getAdmin` itself rather than trusting the middleware redirect —
 * the middleware only checks that a session cookie *exists*, which proves nothing.
 */
export const metadata: Metadata = {
  title: 'Admin · Tavkil',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await getAdmin(new Request('http://localhost', { headers: await headers() }));

  // Signed in with Google but not on the allowlist: back to sign-in with a reason,
  // rather than a bare 403 that looks like a bug.
  if (!admin) redirect('/sign-in?error=not-allowed');

  const held = await permissionsFor(admin.id);
  const byDomain = new Map<string, string[]>();
  for (const code of [...held].sort()) {
    const [domain, action] = code.split(':');
    byDomain.set(domain, [...(byDomain.get(domain) ?? []), action]);
  }

  return (
    <main className="bg-background min-h-dvh px-5 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-foreground text-2xl font-bold tracking-tight">Admin</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Signed in as <span className="text-foreground font-medium">{admin.email}</span>
            </p>
          </div>
          <SignOutButton />
        </div>

        <section className="border-border bg-card mt-8 rounded-lg border p-6">
          <h2 className="text-foreground text-sm font-semibold">Your permissions</h2>
          {held.size === 0 ? (
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              You are allowlisted but hold no role yet, so every admin action will be refused. An
              owner needs to assign you one.
            </p>
          ) : (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {[...byDomain.entries()].map(([domain, actions]) => (
                <div key={domain}>
                  <dt className="text-muted-foreground text-[0.72rem] uppercase tracking-wide">
                    {domain}
                  </dt>
                  <dd className="text-foreground mt-1 font-mono text-sm">{actions.join(' · ')}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <p className="text-muted-foreground mt-6 text-sm">The full dashboard lands in step 9.</p>
      </div>
    </main>
  );
}
