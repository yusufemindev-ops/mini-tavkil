import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { AlertTriangle, CheckCircle2, Info, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Panel, PanelBody, PanelHead } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldHelp, FieldLabel, FormRow } from '@/components/ui/field';
import { SingleImageUpload } from '@/components/ui/media-upload';
import { EditPageSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api/client';
import { EMAIL_TEMPLATES, SETTINGS_TABS, type EmailTemplate } from './fixtures';
import { settingsKeys, updateSettings, useSettings, type GeneralSettings } from './queries';
import {
  currenciesKeys,
  fxKeys,
  refreshFx,
  toggleCurrency,
  useCurrencies,
  useFxRuns,
  type AdminCurrency,
  type FxRun,
} from './currencies-queries';

// Google Maps' "Embed a map" gives a full <iframe … src="…">. Admins paste that
// whole snippet; we keep only the src URL (that's what the storefront renders and
// what the backend validates). A bare URL paste passes through unchanged.
function mapsEmbedSrc(raw: string): string {
  const src = raw.match(/src=["']([^"']+)["']/i);
  return (src ? src[1] : raw).trim();
}

function GeneralTab() {
  const { data, isLoading } = useSettings();
  if (isLoading || !data) return <EditPageSkeleton />;
  return <GeneralForm initial={data} />;
}

function GeneralForm({ initial }: { initial: GeneralSettings }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<GeneralSettings>(initial);
  const set = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const save = useMutation({
    mutationFn: () => updateSettings(form),
    onSuccess: (saved) => {
      queryClient.setQueryData(settingsKeys.all, saved);
      toast.success('Settings saved');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save settings.'),
  });
  return (
    <div className="flex flex-col gap-[18px]">
      {/* Branding */}
      <Panel>
        <PanelHead title="Branding" />
        <PanelBody>
          <Field>
            <FieldLabel>Site name</FieldLabel>
            <Input value={form.siteName} onChange={(e) => set('siteName', e.target.value)} />
          </Field>
          <Field className="mb-0">
            <FieldLabel>Logo</FieldLabel>
            <SingleImageUpload
              value={form.logoUrl}
              onChange={(url) => set('logoUrl', url)}
              size="md"
            />
            <FieldHelp>
              Drag &amp; drop or click to upload. No logo → the storefront shows the site
              name&apos;s first letter.
            </FieldHelp>
          </Field>
        </PanelBody>
      </Panel>

      {/* SEO defaults */}
      <Panel>
        <PanelHead title="SEO defaults" />
        <PanelBody>
          <Field className="mb-0">
            <FieldLabel>Default OG image (1200×630)</FieldLabel>
            <SingleImageUpload
              value={form.ogImageUrl}
              onChange={(url) => set('ogImageUrl', url)}
              size="full"
            />
            <FieldHelp>
              Shown as the preview image when a link to the site is shared on social media.
            </FieldHelp>
          </Field>
        </PanelBody>
      </Panel>

      {/* Contact & social */}
      <Panel>
        <PanelHead
          title="Contact & social"
          action={
            <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
              Admin-managed
            </span>
          }
        />
        <PanelBody>
          <FieldHelp className="mb-3.5 mt-0">
            These details feed the storefront navbar (WhatsApp), the footer social icons, and the
            Contact page (WhatsApp button + map). The WhatsApp <code>wa.me</code> link is derived
            from the number. <strong>Leave a social URL blank to hide that icon</strong> on the
            storefront.
          </FieldHelp>
          <FormRow>
            <Field>
              <FieldLabel>WhatsApp number</FieldLabel>
              <Input
                value={form.whatsappNumber}
                onChange={(e) => set('whatsappNumber', e.target.value)}
              />
              <FieldHelp>
                International format. Powers the navbar icon, footer link &amp; Contact-page button.
              </FieldHelp>
            </Field>
            <Field>
              <FieldLabel>Contact email</FieldLabel>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => set('contactEmail', e.target.value)}
              />
            </Field>
          </FormRow>
          <Field>
            <FieldLabel>Address</FieldLabel>
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Google Maps embed</FieldLabel>
            <Textarea
              rows={3}
              value={form.mapsEmbedUrl}
              placeholder='Paste the <iframe …> from Google Maps → Share → "Embed a map"'
              onChange={(e) => set('mapsEmbedUrl', mapsEmbedSrc(e.target.value))}
            />
            <FieldHelp>
              In Google Maps: <strong>Share → Embed a map</strong> → copy the code and paste it here
              (we keep just the map link). Shows as the interactive map on the Contact page. Leave
              blank to hide the map.
            </FieldHelp>
          </Field>
          <FormRow>
            <Field>
              <FieldLabel>Instagram URL</FieldLabel>
              <Input
                value={form.instagramUrl}
                onChange={(e) => set('instagramUrl', e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>TikTok URL</FieldLabel>
              <Input value={form.tiktokUrl} onChange={(e) => set('tiktokUrl', e.target.value)} />
            </Field>
          </FormRow>
          <Field className="mb-0">
            <FieldLabel>Facebook URL</FieldLabel>
            <Input value={form.facebookUrl} onChange={(e) => set('facebookUrl', e.target.value)} />
          </Field>
        </PanelBody>
      </Panel>

      <div>
        <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}

function CurrenciesTab() {
  return (
    <div className="flex flex-col gap-[18px]">
      <CurrenciesPanel />
      <FxRunsPanel />
    </div>
  );
}

function FxRunsPanel() {
  const queryClient = useQueryClient();
  const { data: runs, isLoading } = useFxRuns();

  const refresh = useMutation({
    mutationFn: refreshFx,
    onSuccess: (run) => {
      void queryClient.invalidateQueries({ queryKey: fxKeys.runs });
      void queryClient.invalidateQueries({ queryKey: currenciesKeys.all });
      if (run.status === 'success') {
        toast.success(
          `Rates updated${run.source && run.source !== 'none' ? ` via ${run.source}` : ''}`,
        );
      } else {
        toast.error(`Refresh failed: ${run.error ?? 'unknown error'}`);
      }
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not refresh rates.'),
  });

  return (
    <Panel>
      <PanelHead
        title="FX rate updates"
        action={
          <Button
            size="sm"
            variant="outline"
            disabled={refresh.isPending}
            onClick={() => refresh.mutate()}
          >
            {refresh.isPending ? 'Refreshing…' : 'Refresh now'}
          </Button>
        }
      />
      <PanelBody tight>
        {isLoading ? (
          <div className="text-muted-foreground px-[18px] py-4 text-sm">Loading…</div>
        ) : !runs || runs.length === 0 ? (
          <div className="text-muted-foreground px-[18px] py-4 text-sm">
            No runs yet. The worker fetches daily — use “Refresh now” to run it immediately.
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {runs.map((run) => (
              <FxRunRow key={run.id} run={run} />
            ))}
          </ul>
        )}
        <div className="border-border text-muted-foreground flex items-start gap-2 border-t px-[18px] py-3 text-xs">
          <Info className="mt-0.5 size-3.5 flex-none" />
          <span>
            The worker fetches USD→TRY once a day (Frankfurter, with open.er-api as fallback) and
            retries every 2h until it succeeds. SAR/AED are USD-pegged — never fetched. Rates are
            display-only.
          </span>
        </div>
      </PanelBody>
    </Panel>
  );
}

function FxRunRow({ run }: { run: FxRun }) {
  const ok = run.status === 'success';
  const rateText = run.rates
    ? Object.entries(run.rates)
        .map(([code, rate]) => `${code} ${rate}`)
        .join(', ')
    : '';
  return (
    <li className="flex items-start justify-between gap-3 px-[18px] py-2.5 text-sm">
      <div className="flex items-start gap-2">
        {ok ? (
          <CheckCircle2 className="mt-0.5 size-4 flex-none text-green-600" />
        ) : (
          <AlertTriangle className="mt-0.5 size-4 flex-none text-amber-600" />
        )}
        <div className="min-w-0">
          <div className="font-medium">
            {ok
              ? `Updated${run.source && run.source !== 'none' ? ` · ${run.source}` : ''}`
              : 'Failed'}
            {ok && rateText && (
              <span className="text-muted-foreground font-normal"> · {rateText}</span>
            )}
          </div>
          {!ok && run.error && <div className="text-muted-foreground text-xs">{run.error}</div>}
        </div>
      </div>
      <span className="text-muted-foreground flex-none text-xs">
        {new Date(run.ranAt).toLocaleString()}
      </span>
    </li>
  );
}

function CurrenciesPanel() {
  const queryClient = useQueryClient();
  const { data: currencies, isLoading } = useCurrencies();

  const toggle = useMutation({
    mutationFn: ({ code, isActive }: { code: string; isActive: boolean }) =>
      toggleCurrency(code, isActive),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: currenciesKeys.all });
      toast.success(updated.isActive ? `${updated.code} enabled` : `${updated.code} disabled`);
    },
    onError: (err) => {
      // Refetch so the Switch snaps back to the server's truth.
      void queryClient.invalidateQueries({ queryKey: currenciesKeys.all });
      toast.error(err instanceof ApiError ? err.message : 'Could not update the currency.');
    },
  });

  if (isLoading) return <EditPageSkeleton />;

  const base = currencies?.find((c) => c.isBase);
  const rest = currencies?.filter((c) => !c.isBase) ?? [];

  return (
    <Panel>
      <PanelHead title="Currencies" />
      <PanelBody>
        <Field>
          <FieldLabel>Base currency</FieldLabel>
          <Input value={base ? `${base.code} — ${base.name}` : 'USD'} readOnly disabled />
          <FieldHelp>
            All prices are stored in the base currency, and new products default to it. Enabling
            another currency turns on a display-only conversion on the storefront — it never changes
            stored prices.
          </FieldHelp>
        </Field>

        <Field className="mb-0">
          <FieldLabel>Display currencies</FieldLabel>
          <div className="border-border divide-border divide-y rounded-lg border">
            {[...(base ? [base] : []), ...rest].map((currency) => (
              <CurrencyRow
                key={currency.code}
                currency={currency}
                disabled={toggle.isPending}
                onToggle={(isActive) => toggle.mutate({ code: currency.code, isActive })}
              />
            ))}
          </div>
          <FieldHelp>
            The base currency can&apos;t be disabled. Rates are for display only.
          </FieldHelp>
        </Field>
      </PanelBody>
    </Panel>
  );
}

function CurrencyRow({
  currency,
  disabled,
  onToggle,
}: {
  currency: AdminCurrency;
  disabled: boolean;
  onToggle: (isActive: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{currency.name}</span>
          <code className="text-muted-foreground font-mono text-xs">{currency.code}</code>
          <span className="text-muted-foreground text-xs">{currency.symbol}</span>
          {currency.isBase && <Badge variant="secondary">Base</Badge>}
        </div>
        {!currency.isBase && currency.rateToUsd != null && (
          <div className="text-muted-foreground mt-0.5 text-[11.5px]">
            1 USD = {currency.rateToUsd} {currency.symbol}
            {currency.rateSource ? ` · ${currency.rateSource}` : ''}
          </div>
        )}
      </div>
      <Switch
        checked={currency.isActive}
        disabled={currency.isBase || disabled}
        onCheckedChange={onToggle}
        aria-label={`Enable ${currency.name}`}
      />
    </div>
  );
}

function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(EMAIL_TEMPLATES);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  const saveTemplate = (updated: EmailTemplate) => {
    setTemplates((list) => list.map((t) => (t.id === updated.id ? updated : t)));
    setEditing(null);
    toast.success('Template saved', { description: `“${updated.name}” updated.` });
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="border-accent/30 bg-accent-soft/40 text-foreground flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px]">
        <Info className="text-accent mt-0.5 size-4 flex-none" />
        <span>
          Automatic emails aren&apos;t active in v1 — they start sending once the email provider is
          connected. <code>{'{{tokens}}'}</code> are filled in per message.
        </span>
      </div>

      <Panel>
        <PanelHead
          title="Transactional emails"
          action={
            <span className="text-muted-foreground text-xs">{templates.length} templates</span>
          }
        />
        <PanelBody tight>
          <Table>
            <thead>
              <tr>
                <th>Template</th>
                <th>Subject</th>
                <th>Sent when</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.name}</span>
                      <Badge variant={t.manual ? 'secondary' : 'primary'}>
                        {t.manual ? 'Manual' : 'Automatic'}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground text-[11.5px]">{t.description}</div>
                  </td>
                  <td>
                    <span className="text-[13px]">{t.subject}</span>
                  </td>
                  <td>
                    <span className="text-muted-foreground text-xs">{t.trigger}</span>
                  </td>
                  <td>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </PanelBody>
      </Panel>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <EmailTemplateForm
            key={editing.id}
            template={editing}
            onCancel={() => setEditing(null)}
            onSave={saveTemplate}
          />
        )}
      </Dialog>
    </div>
  );
}

function EmailTemplateForm({
  template,
  onCancel,
  onSave,
}: {
  template: EmailTemplate;
  onCancel: () => void;
  onSave: (t: EmailTemplate) => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body ?? '');

  return (
    <DialogContent>
      <DialogTitle>Edit “{template.name}”</DialogTitle>
      <DialogDescription>{template.trigger}</DialogDescription>

      <div className="mt-4 flex flex-col gap-3.5">
        <Field className="mb-0">
          <FieldLabel htmlFor="tpl-subject">Subject</FieldLabel>
          <Input id="tpl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field className="mb-0">
          <FieldLabel htmlFor="tpl-body">Body</FieldLabel>
          <Textarea
            id="tpl-body"
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the email body…"
          />
          <FieldHelp>
            Use tokens like <code>{'{{firstName}}'}</code> — they&apos;re filled in per message.
          </FieldHelp>
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave({ ...template, subject, body })}>Save template</Button>
      </div>
    </DialogContent>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab: string }>();
  // The active tab lives in the URL (/settings/:tab) so a refresh stays put.
  const active = SETTINGS_TABS.find((t) => t.id === tabParam) ?? SETTINGS_TABS[0];

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader
        title="Settings"
        subtitle="Locales, currencies, default tier markup, system preferences"
      />

      {/* Sub-tab nav */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className="border-border mb-6 flex gap-0 border-b"
      >
        {SETTINGS_TABS.map((tab) => {
          const isActive = tab.id === active.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => navigate(`/settings/${tab.id}`)}
              className={cn(
                '-mb-px border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {active.id === 'general' && <GeneralTab />}
      {active.id === 'currencies' && <CurrenciesTab />}
      {active.id === 'email' && <EmailTemplatesTab />}
    </div>
  );
}
