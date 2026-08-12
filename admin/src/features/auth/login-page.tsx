import { useState } from 'react';
import { Navigate } from 'react-router';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { GoogleButton } from '@/components/auth/google-button';
import { authClient } from '@/lib/auth-client';
import { BrandSeal } from '@/components/brand-seal';
import { useSession } from '@/features/auth/use-session';

export function LoginPage() {
  const [pending, setPending] = useState(false);

  /**
   * A signed-in admin who lands here goes to the dashboard.
   *
   * `/admin/login` used to render its sign-in card to anyone, including someone
   * already signed in — so navigating back to it offered a second sign-in for an
   * account that was already active, which reads as though the session had been
   * lost.
   *
   * The decision is made from `/api/admin/me`, the same source `ProtectedRoute`
   * uses, rather than from the presence of a cookie. That distinction is what
   * keeps it from looping: a stale or revoked cookie fails the session query, so
   * this falls through and shows the form instead of bouncing to a page that
   * would only send the visitor straight back.
   */
  const { data: session, isLoading } = useSession();

  const signInGoogle = async () => {
    setPending(true);
    const { error } = await authClient.signIn.social({
      provider: 'google',
      // `/admin/dashboard`, not `/dashboard`. Tavkil served this SPA at the root
      // of its own origin, so the bare path was right there. Here it is mounted
      // under /admin, and Better Auth redirects at the ORIGIN — it knows nothing
      // about the router's basename — so the bare path sent a completed sign-in
      // to https://host/dashboard, which is not a route and returned 404.
      callbackURL: `${window.location.origin}/admin/dashboard`,
    });
    if (error) {
      toast.error(error.message ?? 'Could not start Google sign-in.');
      setPending(false);
    }
    // On success the browser is redirected to Google; nothing else to do here.
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex min-h-screen items-center justify-center">
        Loading…
      </div>
    );
  }

  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Minimal top bar — brand + theme toggle (no full nav on the login screen) */}
      <header className="border-border flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <BrandSeal className="size-7 flex-none" />
          <span className="text-foreground text-[0.95rem] font-semibold">Tavkil</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Centered sign-in card */}
      <main className="flex flex-1 flex-col items-center justify-start px-4 pb-4 pt-[14vh]">
        <div className="border-border bg-card w-full max-w-md rounded-2xl border p-8 shadow-sm sm:p-10">
          <div className="bg-primary/10 text-primary mb-6 grid size-12 place-items-center rounded-xl">
            <Building2 className="size-6" />
          </div>

          <h1 className="text-foreground text-2xl font-bold tracking-tight">Admin sign in</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Staff access only. Sign in with your Google account to manage the storefront.
          </p>

          <GoogleButton
            className="mt-7"
            onClick={signInGoogle}
            disabled={pending}
            label={pending ? 'Redirecting…' : 'Sign in with Google'}
          />

          <p className="text-muted-foreground mt-6 text-center text-xs">
            Access is limited to allowlisted team members.
          </p>
        </div>
      </main>
    </div>
  );
}
