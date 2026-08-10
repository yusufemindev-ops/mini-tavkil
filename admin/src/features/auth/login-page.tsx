import { useState } from 'react';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { GoogleButton } from '@/components/auth/google-button';
import { authClient } from '@/lib/auth-client';

export function LoginPage() {
  const [pending, setPending] = useState(false);

  const signInGoogle = async () => {
    setPending(true);
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/dashboard`,
    });
    if (error) {
      toast.error(error.message ?? 'Could not start Google sign-in.');
      setPending(false);
    }
    // On success the browser is redirected to Google; nothing else to do here.
  };

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Minimal top bar — brand + theme toggle (no full nav on the login screen) */}
      <header className="border-border flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md text-sm font-bold">
            T
          </span>
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
