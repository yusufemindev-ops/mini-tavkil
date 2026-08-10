'use client';

import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signIn } from '@/lib/auth-client';

export function SignInForm({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function start() {
    setPending(true);
    setFailed(false);
    try {
      await signIn.social({ provider: 'google', callbackURL: next });
      // On success the browser navigates to Google; `pending` intentionally stays
      // true so the button can't be double-submitted during the hand-off.
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="mt-6">
      <Button onClick={start} disabled={pending} className="w-full">
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {pending ? 'Redirecting to Google…' : 'Continue with Google'}
      </Button>
      {failed && (
        <p role="alert" className="text-destructive mt-3 text-sm">
          Could not reach Google. Check your connection and try again.
        </p>
      )}
    </div>
  );
}
