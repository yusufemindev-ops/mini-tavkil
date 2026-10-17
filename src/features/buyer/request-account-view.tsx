'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useBuyer } from '@/features/buyer/buyer-context';
import { Link, useRouter } from '@/i18n/navigation';
import { COUNTRIES, countryName, type CountryLocale } from '@/lib/countries';
import { apiUrl } from '@/lib/env';
import { cn } from '@/lib/utils';

const INPUT_CLASS =
  'border-border bg-background text-foreground flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus:outline-none';
const LABEL_CLASS = 'text-foreground block text-xs font-medium';

export function RequestAccountView() {
  const t = useTranslations('store');
  const locale = useLocale();
  const router = useRouter();
  const { buyer, loading } = useBuyer();
  const countryLocale: CountryLocale = locale === 'tr' || locale === 'ar' ? locale : 'en';

  const sortedCountries = useMemo(
    () =>
      [...COUNTRIES].sort((a, b) =>
        countryName(a, countryLocale).localeCompare(countryName(b, countryLocale), countryLocale),
      ),
    [countryLocale],
  );

  useEffect(() => {
    if (!loading && buyer) {
      router.replace('/account');
    }
  }, [buyer, loading, router]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('DE');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch(apiUrl('/api/account-requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          jobTitle: jobTitle.trim() || undefined,
          company: company.trim(),
          country: country.trim().toUpperCase(),
          city: city.trim() || undefined,
          address: address.trim() || undefined,
          message: message.trim() || undefined,
          locale: countryLocale,
        }),
      });

      if (res.status === 409) {
        setErrorMessage(t('rq_email_exists'));
        return;
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: { message?: string; details?: Record<string, string[]> };
        } | null;
        const firstFieldErr = body?.error?.details
          ? Object.values(body.error.details).flat()[0]
          : undefined;
        setErrorMessage(firstFieldErr || body?.error?.message || t('rq_submit_error'));
        return;
      }

      setSubmitted(true);
    } catch {
      setErrorMessage(t('rq_submit_error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <div className="border-border bg-card rounded-lg border p-6 text-center sm:p-10">
          <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full">
            <CheckCircle2 className="size-6" />
          </div>
          <h1 className="text-foreground mt-4 text-2xl font-bold tracking-tight">
            {t('rq_pending_t')}
          </h1>
          <p className="text-muted-foreground mt-2.5 text-sm leading-relaxed">
            {t('rq_pending_d')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/" className={cn(buttonVariants({ size: 'default' }))}>
              {t('rq_back_home')}
            </Link>
            <Link href="/catalogue" className={cn(buttonVariants({ variant: 'outline' }))}>
              {t('cta_browse')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-4">
      <div className="border-border bg-card rounded-lg border p-6 sm:p-8">
        <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('rq_title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t('rq_sub')}</p>

        <div className="border-border bg-background-2 text-muted-foreground mt-4 flex items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-xs">
          <ShieldCheck className="text-primary size-4 shrink-0" />
          <span>{t('rq_note')}</span>
        </div>

        {errorMessage && (
          <div className="border-destructive/30 bg-destructive/5 text-destructive mt-5 flex items-start gap-2.5 rounded-md border p-3.5 text-xs">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="rq-firstName" className={LABEL_CLASS}>
                {t('rq_first_name')} *
              </label>
              <input
                id="rq-firstName"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={80}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="rq-lastName" className={LABEL_CLASS}>
                {t('rq_last_name')} *
              </label>
              <input
                id="rq-lastName"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={80}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="rq-email" className={LABEL_CLASS}>
                {t('rq_email')} *
              </label>
              <input
                id="rq-email"
                type="email"
                required
                placeholder={t('si_email_ph')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="rq-phone" className={LABEL_CLASS}>
                {t('rq_phone')} *
              </label>
              <input
                id="rq-phone"
                type="tel"
                required
                placeholder="+49 170 0000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="rq-company" className={LABEL_CLASS}>
                {t('rq_company')} *
              </label>
              <input
                id="rq-company"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                maxLength={160}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="rq-jobTitle" className={LABEL_CLASS}>
                {t('rq_job_title')}
              </label>
              <input
                id="rq-jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                maxLength={120}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="rq-country" className={LABEL_CLASS}>
                {t('rq_country')} *
              </label>
              <select
                id="rq-country"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={INPUT_CLASS}
              >
                {sortedCountries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {countryName(c, countryLocale)} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="rq-city" className={LABEL_CLASS}>
                {t('rq_city')}
              </label>
              <input
                id="rq-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={120}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rq-address" className={LABEL_CLASS}>
              {t('rq_address')}
            </label>
            <input
              id="rq-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={300}
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rq-message" className={LABEL_CLASS}>
              {t('rq_message')}
            </label>
            <textarea
              id="rq-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm shadow-xs focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" size="lg" disabled={submitting} className="w-full gap-2">
              {t('rq_submit')}
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Button>
          </div>
        </form>

        <div className="border-border mt-6 border-t pt-5 text-center text-sm">
          <span className="text-muted-foreground">{t('rq_have')}</span>{' '}
          <Link href="/login" className="text-primary-ink font-semibold hover:underline">
            {t('si_link')}
          </Link>
        </div>
      </div>
    </div>
  );
}
