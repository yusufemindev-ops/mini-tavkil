'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';

/**
 * The contact form.
 *
 * Written by hand rather than with react-hook-form because it is five fields and
 * the interesting requirements are elsewhere: errors arrive from the server per
 * field, and **nothing the visitor typed is ever cleared on failure**. Losing a
 * 400-word enquiry to a captcha timeout is the one outcome that guarantees they
 * don't try again.
 */
type FieldErrors = Partial<Record<string, string[]>>;

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'auto' | 'light' | 'dark';
        },
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

export function ContactForm({
  siteKey,
  product,
}: {
  siteKey: string;
  product?: { slug: string; name: string };
}) {
  const t = useTranslations('store');
  const locale = useLocale();

  const [values, setValues] = useState({ name: '', email: '', company: '', message: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const [token, setToken] = useState('');
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);

  // Load Turnstile once and render the widget. Without a site key the widget is
  // skipped and the submit button explains why — better than a form that posts
  // and always fails.
  useEffect(() => {
    if (!siteKey || !widgetRef.current) return;

    function render() {
      if (!window.turnstile || !widgetRef.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(widgetRef.current, {
        sitekey: siteKey,
        theme: 'auto',
        callback: setToken,
        'expired-callback': () => setToken(''),
        'error-callback': () => setToken(''),
      });
    }

    if (window.turnstile) {
      render();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [siteKey]);

  function set(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear only this field's error as it is corrected, so the rest stay visible.
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    setErrors({});

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          locale,
          turnstileToken: token,
          productSlug: product?.slug ?? '',
          productName: product?.name ?? '',
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: { message?: string; details?: FieldErrors };
      } | null;

      if (response.ok && payload?.ok) {
        setSent(true);
        return;
      }

      setErrors(payload?.error?.details ?? {});
      setFormError(payload?.error?.message ?? t('con_form_error'));
      // A token is single-use: after any failure the widget must be reset or the
      // next attempt is rejected for reusing it, which looks like a broken form.
      window.turnstile?.reset(widgetId.current);
      setToken('');
    } catch {
      setFormError(t('con_form_error'));
      window.turnstile?.reset(widgetId.current);
      setToken('');
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        className="border-ok/30 bg-ok/10 flex flex-col items-start gap-3 rounded-lg border p-6"
      >
        <CheckCircle2 className="text-ok size-7" aria-hidden />
        <h2 className="text-foreground text-lg font-bold tracking-tight">{t('con_sent_t')}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{t('con_sent_d')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="contact-name"
          label={t('con_f_name')}
          value={values.name}
          onChange={(v) => set('name', v)}
          error={errors.name?.[0]}
          autoComplete="name"
          required
        />
        <TextField
          id="contact-email"
          label={t('con_f_email')}
          type="email"
          value={values.email}
          onChange={(v) => set('email', v)}
          error={errors.email?.[0]}
          autoComplete="email"
          required
        />
      </div>

      <TextField
        id="contact-company"
        label={t('con_f_company')}
        value={values.company}
        onChange={(v) => set('company', v)}
        error={errors.company?.[0]}
        autoComplete="organization"
      />

      <Field label={t('con_f_message')} htmlFor="contact-message" error={errors.message?.[0]}>
        <Textarea
          id="contact-message"
          rows={6}
          required
          value={values.message}
          onChange={(event) => set('message', event.target.value)}
          aria-invalid={errors.message ? true : undefined}
        />
      </Field>

      {product && (
        <p className="text-muted-foreground text-sm">
          {t('con_about_product')}{' '}
          <b dir="auto" className="text-foreground">
            {product.name}
          </b>
        </p>
      )}

      {/*
        Reserved height stops the layout jumping when Turnstile mounts — but only
        when there is a widget coming. With no site key configured, an empty 65px
        gap sits between the message box and a disabled button and reads as
        something that failed to load.
      */}
      {siteKey && <div ref={widgetRef} className="min-h-[65px]" />}

      {formError && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-sm border p-3 text-sm"
        >
          {formError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending || !siteKey} className="w-fit">
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {pending ? t('con_sending') : t('con_send')}
      </Button>

      {!siteKey && <p className="text-muted-foreground text-sm">{t('con_unconfigured')}</p>}
    </form>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <Input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
      />
    </Field>
  );
}
