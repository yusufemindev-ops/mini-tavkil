import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ChevronRight, ExternalLink, MapPin, Package } from 'lucide-react';
import { getCountry } from '@repo/countries';
import { WhatsAppIcon } from '@repo/icons';
import { CountrySelect } from '@/components/ui/country-select';
import { PageHeader } from '@/components/ui/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { CatalogStatusSelect } from '@/components/ui/catalog-status-select';
import { Input } from '@/components/ui/input';
import { SelectMenu } from '@/components/ui/select-menu';
import { Textarea } from '@/components/ui/textarea';
import { PhoneInput } from '@/components/ui/phone-input';
import { Panel, PanelBody, PanelHead } from '@/components/ui/panel';
import { Field, FieldError, FieldHelp, FieldLabel } from '@/components/ui/field';
import { RightStack, TwoCol } from '@/components/ui/two-col';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EditPageSkeleton } from '@/components/ui/skeleton';
import { SingleImageUpload } from '@/components/ui/media-upload';
import { ApiError } from '@/lib/api/client';
import { apiFieldErrors } from '@/lib/api/field-errors';
import { buildPhone, splitPhone, waHref } from '@/lib/phone';
import { toSlug, toSlugLive } from '@/lib/slug';
import { pickTranslation } from '@/features/categories/translations';
import { resolveMapsHref } from './maps';
import type { TranslationPayload } from '@/features/categories/queries';
import {
  createSupplier,
  deleteSupplier,
  publishSupplier,
  suppliersKeys,
  unpublishSupplier,
  updateSupplier,
  useSupplier,
  type AdminSupplier,
} from './queries';

// Suppliers are internal records, so the form edits the English translation
// only (name + auto-slug). The save payload sends exactly one translation row.
function buildTranslations(name: string, slug: string): TranslationPayload[] {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) return [];
  const finalSlug = slug.trim() || toSlug(trimmedName);
  return [
    {
      locale: 'en',
      name: trimmedName,
      slug: finalSlug,
      is_complete: trimmedName.length > 0 && finalSlug.length > 0,
    },
  ];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isHttpUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

interface SupplierErrors {
  name?: string;
  email?: string;
  mapUrl?: string;
}

const SUPPLIER_ERROR_KEYS = [
  'name',
  'email',
  'mapUrl',
] as const satisfies readonly (keyof SupplierErrors)[];

// Backend field → form error key (the form labels them differently).
function mapSupplierIssuePath(path: (string | number)[]): string | undefined {
  if (path[0] === 'contactEmailInternal') return 'email';
  if (path[0] === 'mapUrl') return 'mapUrl';
  if (path[0] === 'translations' && typeof path[2] === 'string' && path[2] === 'name')
    return 'name';
  for (let i = path.length - 1; i >= 0; i--) {
    if (typeof path[i] === 'string') return path[i] as string;
  }
  return undefined;
}

function SupplierEditor({ supplier, isNew }: { supplier: AdminSupplier | null; isNew: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const en = pickTranslation(supplier?.translations ?? []);
  const [name, setName] = useState(en?.name ?? '');
  const [slug, setSlug] = useState(en?.slug ?? '');
  // Existing (non-empty) slugs start touched so we never auto-rewrite an
  // existing URL; new suppliers start untouched so the slug follows the name.
  const [slugTouched, setSlugTouched] = useState(() => (en?.slug ?? '').trim().length > 0);
  const [countryCode, setCountryCode] = useState(supplier?.countryCode ?? 'TR');
  const [logoUrl, setLogoUrl] = useState(supplier?.logoUrl ?? '');
  const [website, setWebsite] = useState(supplier?.website ?? '');
  const [email, setEmail] = useState(supplier?.contactEmailInternal ?? '');
  const initialPhone = splitPhone(supplier?.contactPhoneInternal);
  const [phoneCountry, setPhoneCountry] = useState(initialPhone.countryCode);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone.number);
  const [notes, setNotes] = useState(supplier?.internalNotes ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [mapUrl, setMapUrl] = useState(supplier?.mapUrl ?? '');
  const [errors, setErrors] = useState<SupplierErrors>({});
  const clearError = (key: keyof SupplierErrors) =>
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  const [verified, setVerified] = useState(supplier?.isVerified ?? false);
  const [status, setStatus] = useState(supplier?.status ?? 'draft');

  const heading = name || (isNew ? 'New supplier' : 'Untitled supplier');
  const supplierId = supplier?.id ?? '';
  const productCount = supplier?.productCount ?? 0;
  const hasProducts = productCount > 0;

  // "View on Google Maps" prefers an explicit share link; otherwise it falls
  // back to a Maps search for the free-text address. Disabled only when both
  // are empty.
  const mapsHref = resolveMapsHref(mapUrl, address);
  const mapsDisabled = mapsHref.length === 0;

  // Dial-coded phone (stored value). Drives both the save payload and the
  // WhatsApp deep link; empty when there's no national number.
  const phoneDial = getCountry(phoneCountry)?.dial ?? '';
  const composedPhone = buildPhone(phoneDial, phoneNumber);

  function updateName(value: string) {
    setName(value);
    // Typing the name auto-fills the slug until the operator edits it directly.
    if (!slugTouched) setSlug(toSlug(value));
  }

  function updateSlug(value: string) {
    // A direct slug edit marks the slug touched → stop auto-syncing it.
    // Format live as the operator types so an invalid slug can't be entered.
    setSlugTouched(true);
    setSlug(toSlugLive(value));
  }

  // Final tidy on blur — full toSlug() drops any trailing separator left by
  // mid-word typing (e.g. "test-" → "test").
  function tidySlug() {
    setSlug((prev) => toSlug(prev));
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: suppliersKeys.all });
    if (supplier)
      void queryClient.invalidateQueries({ queryKey: suppliersKeys.detail(supplier.id) });
  };

  // Draft saves anything EXCEPT a nameless record (a name is the minimum
  // identity) and INVALID input (bad email / URL). Everything else is enforced
  // by the publish gate.
  function onSave() {
    const next: SupplierErrors = {};
    if (!name.trim()) next.name = 'Supplier name is required.';
    const em = email.trim();
    if (em && !EMAIL_RE.test(em)) next.email = 'Enter a valid email address.';
    const m = mapUrl.trim();
    if (m && !isHttpUrl(m)) next.mapUrl = 'Enter a valid URL (https://…).';
    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      toast.error('Please fix the highlighted fields.');
      return;
    }
    save.mutate();
  }

  const save = useMutation({
    mutationFn: () => {
      const translations = buildTranslations(name, slug);
      const base = {
        countryCode,
        logoUrl: logoUrl.trim() || null,
        website: website.trim() || null,
        contactEmailInternal: email.trim() || null,
        contactPhoneInternal: composedPhone || null,
        internalNotes: notes.trim() || null,
        address: address.trim() || null,
        mapUrl: mapUrl.trim() || null,
        isVerified: verified,
      };
      return isNew
        ? createSupplier({ ...base, translations })
        : updateSupplier(supplierId, {
            ...base,
            status: status as 'draft' | 'published',
            translations,
          });
    },
    onSuccess: (saved) => {
      toast.success(isNew ? 'Supplier created' : 'Supplier saved');
      invalidate();
      if (isNew) navigate(`/suppliers/${saved.id}`);
    },
    onError: (err) => {
      const fieldErrors = apiFieldErrors(err, {
        keyFor: mapSupplierIssuePath,
        allowed: SUPPLIER_ERROR_KEYS,
      });
      if (Object.keys(fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
        toast.error('Please fix the highlighted fields.');
        return;
      }
      toast.error(err instanceof ApiError ? err.message : 'Could not save the supplier.');
    },
  });

  const publish = useMutation({
    mutationFn: () => publishSupplier(supplierId),
    onSuccess: () => {
      toast.success('Supplier published');
      setStatus('published');
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not publish the supplier.'),
  });

  const unpublish = useMutation({
    mutationFn: () => unpublishSupplier(supplierId),
    onSuccess: () => {
      toast.success('Supplier unpublished');
      setStatus('draft');
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not unpublish the supplier.'),
  });

  const remove = useMutation({
    mutationFn: () => deleteSupplier(supplierId),
    onSuccess: () => {
      toast.success('Supplier deleted');
      void queryClient.invalidateQueries({ queryKey: suppliersKeys.all });
      navigate('/suppliers');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not delete the supplier.'),
  });

  const viewProductsDisabled = isNew || !hasProducts;
  const viewProductsTitle = viewProductsDisabled
    ? 'No products for this supplier'
    : `View ${productCount} product${productCount === 1 ? '' : 's'}`;

  return (
    <div className="mx-auto max-w-[1200px]">
      <nav className="text-muted-foreground mb-4 flex items-center gap-1 text-[13px]">
        <Link to="/suppliers" className="hover:text-foreground">
          Suppliers
        </Link>
        <ChevronRight className="size-3.5 shrink-0" />
        <span className="text-foreground min-w-0 truncate">{heading}</span>
      </nav>

      <PageHeader
        title={heading}
        subtitle="Internal record · Not shown publicly"
        actions={
          <>
            {!isNew && (
              <Button
                variant="outline"
                onClick={() => navigate(`/products?supplier=${supplierId}`)}
                disabled={viewProductsDisabled}
                title={viewProductsTitle}
              >
                <Package className="size-4" />
                View products
              </Button>
            )}
            <Button
              onClick={onSave}
              disabled={save.isPending || !name.trim()}
              title={name.trim() ? undefined : 'Enter a supplier name first'}
            >
              {isNew ? 'Save as draft' : 'Save changes'}
            </Button>
          </>
        }
      />

      <TwoCol>
        <div className="flex flex-col gap-[18px]">
          {/* Supplier name + slug. Suppliers are internal, so English only —
              no TR/AR tabs and no public-facing description. */}
          <Panel>
            <PanelHead title="Supplier" />
            <PanelBody>
              <Field>
                <FieldLabel required>Supplier name</FieldLabel>
                <Input
                  value={name}
                  aria-invalid={!!errors.name}
                  onChange={(e) => {
                    updateName(e.target.value);
                    clearError('name');
                  }}
                />
                {errors.name && <FieldError>{errors.name}</FieldError>}
                <FieldHelp>
                  Used in admin lists, in cart line items (post-auth), and as the JSON-LD{' '}
                  <code>Product.brand</code> fallback when a product has no explicit brand name.
                </FieldHelp>
              </Field>
              <Field>
                <FieldLabel>Slug</FieldLabel>
                <Input
                  value={slug}
                  onChange={(e) => updateSlug(e.target.value)}
                  onBlur={tidySlug}
                />
              </Field>
              <Field className="mb-0">
                <FieldLabel required>Country</FieldLabel>
                <CountrySelect
                  value={countryCode}
                  onChange={setCountryCode}
                  locale="en"
                  variant="country"
                  placeholder="Select country…"
                  searchPlaceholder="Search country"
                  emptyText="No match"
                />
              </Field>
            </PanelBody>
          </Panel>

          {/* Internal contact */}
          <Panel>
            <PanelHead title="Internal contact (operations only)" />
            <PanelBody>
              <Field>
                <FieldLabel>Contact email</FieldLabel>
                <Input
                  type="email"
                  value={email}
                  aria-invalid={!!errors.email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError('email');
                  }}
                />
                {errors.email && <FieldError>{errors.email}</FieldError>}
              </Field>
              <Field>
                <FieldLabel>Contact phone</FieldLabel>
                <PhoneInput
                  countryCode={phoneCountry}
                  number={phoneNumber}
                  onCountryChange={setPhoneCountry}
                  onNumberChange={setPhoneNumber}
                />
                {/* Always shown; disabled until a number is entered, then it
                      deep-links to wa.me (matches the "View on Google Maps" button). */}
                {composedPhone ? (
                  <a
                    href={waHref(composedPhone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Message on WhatsApp"
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                      className: 'text-success mt-2.5',
                    })}
                  >
                    <WhatsAppIcon className="size-4" />
                    WhatsApp
                  </a>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled
                    title="Add a phone number first"
                    className="mt-2.5"
                  >
                    <WhatsAppIcon className="size-4" />
                    WhatsApp
                  </Button>
                )}
              </Field>
              <Field className="mb-0">
                <FieldLabel>Website</FieldLabel>
                <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </Field>
              <FieldHelp className="mt-2.5">
                Used by operators for logistics coordination. Never exposed to buyers.
              </FieldHelp>
            </PanelBody>
          </Panel>

          {/* Address (internal — operations / logistics only) */}
          <Panel>
            <PanelHead title="Address (internal)" />
            <PanelBody>
              <Field>
                <FieldLabel>Address</FieldLabel>
                <Textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Atatürk Cd. No: 12, Şişli, İstanbul, Türkiye"
                />
                <FieldHelp>Free-text address. Internal only — never shown to buyers.</FieldHelp>
              </Field>
              <Field className="mb-0">
                <FieldLabel>Google Maps URL</FieldLabel>
                <Input
                  type="url"
                  value={mapUrl}
                  aria-invalid={!!errors.mapUrl}
                  onChange={(e) => {
                    setMapUrl(e.target.value);
                    clearError('mapUrl');
                  }}
                  placeholder="https://maps.app.goo.gl/…"
                />
                {errors.mapUrl && <FieldError>{errors.mapUrl}</FieldError>}
                <FieldHelp>Paste a Google Maps share link for the exact location.</FieldHelp>
                {mapsDisabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled
                    title="Add an address or map link first"
                    className="mt-2.5"
                  >
                    <MapPin className="size-4" />
                    View on Google Maps
                  </Button>
                ) : (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'sm',
                      className: 'mt-2.5',
                    })}
                  >
                    <MapPin className="size-4" />
                    View on Google Maps
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </Field>
            </PanelBody>
          </Panel>

          {/* Internal notes */}
          <Panel>
            <PanelHead title="Internal notes" />
            <PanelBody>
              <Field className="mb-0">
                <FieldLabel>Notes (admin only)</FieldLabel>
                <Textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Prefers WhatsApp over email. Payment terms: net 30."
                />
                <FieldHelp>
                  Only visible to admins. Use this to remember context for future interactions.
                </FieldHelp>
              </Field>
            </PanelBody>
          </Panel>

          {/* Logo — kept in the main column for consistency with products/categories */}
          <Panel>
            <PanelHead title="Logo" />
            <PanelBody>
              <Field className="mb-0">
                <FieldLabel>Logo</FieldLabel>
                <SingleImageUpload value={logoUrl} onChange={setLogoUrl} label="Upload logo" />
                <FieldHelp>Pick an image file — it uploads and shows a preview here.</FieldHelp>
              </Field>
            </PanelBody>
          </Panel>
        </div>

        <RightStack>
          {/* Verification & status (meta) */}
          <Panel>
            <PanelHead title="Verification & status" />
            <PanelBody>
              <Field className={isNew ? 'mb-0' : ''}>
                <FieldLabel>Verification status</FieldLabel>
                <SelectMenu
                  value={verified ? 'verified' : 'unverified'}
                  onValueChange={(v) => setVerified(v === 'verified')}
                  options={[
                    { value: 'verified', label: 'Verified' },
                    { value: 'unverified', label: 'Unverified' },
                  ]}
                />
                <FieldHelp>
                  Documents reviewed, site visit complete, ≥ 3 successful pilot orders.
                </FieldHelp>
              </Field>
              {!isNew && (
                <Field className="mb-0">
                  <FieldLabel>Status</FieldLabel>
                  <CatalogStatusSelect
                    status={status}
                    statuses={['published', 'draft']}
                    disabled={publish.isPending || unpublish.isPending}
                    onSelect={(next) => {
                      if (next === 'published') publish.mutate();
                      else if (next === 'draft') unpublish.mutate();
                    }}
                  />
                  <FieldHelp>Publishing runs the publish gate. Save your changes first.</FieldHelp>
                </Field>
              )}
            </PanelBody>
          </Panel>

          {/* Danger zone */}
          {!isNew && (
            <Panel className="border-destructive/20">
              <PanelHead
                title={<span className="text-destructive">Danger zone</span>}
                className="border-destructive/20"
              />
              <PanelBody>
                <p className="text-muted-foreground mb-3 text-[13px]">
                  Deleting removes this supplier record. Products linked to it must be reassigned.
                </p>
                <ConfirmDialog
                  trigger={
                    <Button variant="destructive" size="sm" disabled={remove.isPending}>
                      Delete supplier
                    </Button>
                  }
                  title="Delete this supplier?"
                  description="This is a soft delete. Products routed to this supplier may be affected."
                  confirmLabel="Delete supplier"
                  destructive
                  onConfirm={() => remove.mutate()}
                />
              </PanelBody>
            </Panel>
          )}
        </RightStack>
      </TwoCol>
    </div>
  );
}

export function SupplierEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const { data: supplier, isLoading } = useSupplier(id ?? '', !isNew);

  if (isNew) {
    return <SupplierEditor key="new" supplier={null} isNew />;
  }

  if (isLoading) {
    return <EditPageSkeleton />;
  }

  if (!supplier) {
    return (
      <div className="mx-auto max-w-[880px]">
        <PageHeader title="Supplier not found" subtitle={`No supplier matches "${id ?? ''}".`} />
        <Panel>
          <PanelBody>
            <p className="text-muted-foreground text-sm">
              This supplier may have been removed.{' '}
              <Link to="/suppliers" className="text-primary font-medium hover:underline">
                Back to suppliers
              </Link>
              .
            </p>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  return <SupplierEditor key={supplier.id} supplier={supplier} isNew={false} />;
}
