'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle, ArrowRight, Clock, LogIn, ShieldAlert } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useBuyer } from '@/features/buyer/buyer-context';
import { Link, useRouter } from '@/i18n/navigation';
import { signIn } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export function LoginView() {
  const t = useTranslations('store');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { buyer, loading } = useBuyer();
  const [signingIn, setSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const errorParam = searchParams.get('error');

  useEffect(() => {
    if (!loading && buyer) {
      router.replace('/account');
    }
  }, [buyer, loading, router]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setLocalError(null);
    try {
      await signIn.social({
        provider: 'google',
        callbackURL: `/${locale}/account`,
        errorCallbackURL: `/${locale}/login`,
      });
    } catch {
      setLocalError('default');
      setSigningIn(false);
    }
  };

  const activeError = localError ?? errorParam;

  const renderErrorBanner = () => {
    if (!activeError) return null;
    const code = activeError.toUpperCase();

    if (code.includes('REQUEST_PENDING')) {
      return (
        <div className="border-primary/30 bg-primary/5 mb-6 flex items-start gap-3 rounded-md border p-4">
          <Clock className="text-primary mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-foreground text-sm font-semibold">{t('si_pending_t')}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {t('si_pending_d')}
            </p>
          </div>
        </div>
      );
    }

    if (code.includes('BANNED_USER')) {
      return (
        <div className="border-destructive/30 bg-destructive/5 mb-6 flex items-start gap-3 rounded-md border p-4">
          <ShieldAlert className="text-destructive mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-foreground text-sm font-semibold">{t('si_suspended_t')}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {t('si_suspended_d')}
            </p>
            <Link
              href="/contact"
              className="text-primary-ink mt-2 inline-block text-xs font-semibold hover:underline"
            >
              {t('si_contact_link')}
            </Link>
          </div>
        </div>
      );
    }

    if (code.includes('NOT_BUYER')) {
      return (
        <div className="border-destructive/30 bg-destructive/5 mb-6 flex items-start gap-3 rounded-md border p-4">
          <AlertCircle className="text-destructive mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-foreground text-sm font-semibold">{t('si_not_buyer_t')}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {t('si_not_buyer_d')}
            </p>
          </div>
        </div>
      );
    }

    if (code.includes('BUYER_NOT_REGISTERED') || code.includes('USER_NOT_FOUND')) {
      return (
        <div className="border-border bg-background-2 mb-6 flex items-start gap-3 rounded-md border p-4">
          <AlertCircle className="text-foreground mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-foreground text-sm font-semibold">{t('si_no_account_t')}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {t('si_no_account_d')}
            </p>
            <Link
              href="/request"
              className={cn(buttonVariants({ size: 'sm' }), 'mt-3 inline-flex')}
            >
              {t('si_request_link')}
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="border-destructive/30 bg-destructive/5 mb-6 flex items-start gap-3 rounded-md border p-4">
        <AlertCircle className="text-destructive mt-0.5 size-5 shrink-0" />
        <div>
          <p className="text-foreground text-sm font-semibold">{t('si_error_t')}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{t('si_error_d')}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-md py-8">
      <div className="border-border bg-card rounded-lg border p-6 sm:p-8">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{t('si_title')}</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t('si_sub')}</p>

        <div className="mt-6">
          {renderErrorBanner()}

          <Button
            type="button"
            size="lg"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full gap-2.5"
          >
            <LogIn className="size-4" />
            {t('si_google')}
          </Button>
        </div>

        <div className="border-border mt-6 border-t pt-5 text-center text-sm">
          <span className="text-muted-foreground">{t('si_noacc')}</span>{' '}
          <Link
            href="/request"
            className="text-primary-ink inline-flex items-center gap-1 font-semibold hover:underline"
          >
            {t('si_request_link')}
            <ArrowRight className="size-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}
