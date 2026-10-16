'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  Building2,
  CheckCircle2,
  Clock,
  LogOut,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  User,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { useBuyer } from '@/features/buyer/buyer-context';
import { Link, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const INPUT_CLASS =
  'border-border bg-background text-foreground flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus:outline-none';
const LABEL_CLASS = 'text-foreground block text-xs font-medium';

export function AccountView() {
  const t = useTranslations('store');
  const router = useRouter();
  const { buyer, loading, refreshBuyer, signOutBuyer } = useBuyer();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!loading && !buyer) {
      router.replace('/login');
    }
  }, [buyer, loading, router]);

  if (loading || !buyer) {
    return (
      <div className="text-muted-foreground py-16 text-center text-sm">{t('acc_loading')}…</div>
    );
  }

  const startEditing = () => {
    setFirstName(buyer.firstName ?? '');
    setLastName(buyer.lastName ?? '');
    setCompanyName(buyer.companyName ?? '');
    setJobTitle(buyer.jobTitle ?? '');
    setPhone(buyer.phone ?? '');
    setCountry(buyer.country ?? '');
    setCity(buyer.city ?? '');
    setAddress(buyer.address ?? '');
    setErrorMsg(null);
    setEditing(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/buyer/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: companyName.trim() || null,
          jobTitle: jobTitle.trim() || null,
          phone: phone.trim() || null,
          country: (country.trim().slice(0, 2) || 'DE').toUpperCase(),
          city: city.trim() || null,
          address: address.trim() || null,
        }),
      });

      if (!res.ok) {
        setErrorMsg(t('prof_edit_error'));
        return;
      }

      await refreshBuyer();
      setEditing(false);
    } catch {
      setErrorMsg(t('prof_edit_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOutBuyer();
    router.replace('/login');
  };

  const memberSince = buyer.memberSince
    ? new Date(buyer.memberSince).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">{t('prof_title')}</h1>
          <div className="mt-2 flex items-center gap-2">
            {buyer.verified ? (
              <span className="bg-primary/10 text-primary-ink inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
                <CheckCircle2 className="size-3.5" />
                {t('prof_verified')}
              </span>
            ) : (
              <span className="border-border bg-background-2 text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
                <Clock className="size-3.5" />
                {t('prof_unverified')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/orders"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <Package className="size-4" />
            {t('nav_orders')}
          </Link>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5">
            <LogOut className="size-4" />
            {t('prof_signout')}
          </Button>
        </div>
      </div>

      <section className="border-border bg-card rounded-lg border p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-foreground text-lg font-semibold">{t('prof_acct')}</h2>
          {!editing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startEditing}
              className="gap-1.5"
            >
              <Pencil className="size-3.5" />
              {t('prof_edit')}
            </Button>
          )}
        </div>

        {!editing ? (
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Building2 className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div>
                <dt className="text-muted-foreground text-xs font-medium uppercase">
                  {t('prof_company')}
                </dt>
                <dd className="text-foreground mt-0.5 text-sm font-medium">
                  {buyer.companyName || '—'}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div>
                <dt className="text-muted-foreground text-xs font-medium uppercase">
                  {t('prof_name')}
                </dt>
                <dd className="text-foreground mt-0.5 text-sm font-medium">
                  {buyer.contactName || '—'}
                  {buyer.jobTitle ? ` · ${buyer.jobTitle}` : ''}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div>
                <dt className="text-muted-foreground text-xs font-medium uppercase">
                  {t('prof_email')}
                </dt>
                <dd className="text-foreground mt-0.5 font-mono text-sm">{buyer.email}</dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div>
                <dt className="text-muted-foreground text-xs font-medium uppercase">
                  {t('prof_phone')}
                </dt>
                <dd dir="auto" className="text-foreground mt-0.5 font-mono text-sm">
                  {buyer.phone || '—'}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div>
                <dt className="text-muted-foreground text-xs font-medium uppercase">
                  {t('prof_country')}
                </dt>
                <dd className="text-foreground mt-0.5 text-sm font-medium">
                  {[buyer.city, buyer.country].filter(Boolean).join(', ') || '—'}
                  {buyer.address ? (
                    <div className="text-muted-foreground mt-0.5 text-xs">{buyer.address}</div>
                  ) : null}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div>
                <dt className="text-muted-foreground text-xs font-medium uppercase">
                  {t('prof_member')}
                </dt>
                <dd className="text-foreground mt-0.5 text-sm font-medium">{memberSince}</dd>
              </div>
            </div>
          </dl>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-4">
            {errorMsg && <p className="text-destructive text-xs font-medium">{errorMsg}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="acc-firstName" className={LABEL_CLASS}>
                  {t('rq_first_name')}
                </label>
                <input
                  id="acc-firstName"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="acc-lastName" className={LABEL_CLASS}>
                  {t('rq_last_name')}
                </label>
                <input
                  id="acc-lastName"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="acc-company" className={LABEL_CLASS}>
                  {t('prof_company')}
                </label>
                <input
                  id="acc-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="acc-jobTitle" className={LABEL_CLASS}>
                  {t('rq_job_title')}
                </label>
                <input
                  id="acc-jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="acc-phone" className={LABEL_CLASS}>
                  {t('prof_phone')}
                </label>
                <input
                  id="acc-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="acc-country" className={LABEL_CLASS}>
                  {t('prof_country')} (ISO-2)
                </label>
                <input
                  id="acc-country"
                  required
                  maxLength={2}
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="acc-city" className={LABEL_CLASS}>
                  {t('rq_city')}
                </label>
                <input
                  id="acc-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="acc-address" className={LABEL_CLASS}>
                  {t('rq_address')}
                </label>
                <input
                  id="acc-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                {t('prof_edit_cancel_btn')}
              </Button>
              <Button type="submit" disabled={saving}>
                {t('prof_edit_submit')}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
