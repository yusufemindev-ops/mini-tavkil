import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Eye } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Panel, PanelBody, PanelHead } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectMenu } from '@/components/ui/select-menu';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldError, FieldHelp, FieldLabel } from '@/components/ui/field';
import { TwoCol, RightStack } from '@/components/ui/two-col';
import { LocaleTabs } from '@/components/ui/locale-tabs';
import { PublishGate } from '@/components/ui/publish-gate';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EditPageSkeleton } from '@/components/ui/skeleton';
import { SingleImageUpload } from '@/components/ui/media-upload';
import { ApiError } from '@/lib/api/client';
import { apiFieldErrors } from '@/lib/api/field-errors';
import { toSlug, toSlugLive } from '@/lib/slug';
import { CatalogStatusDot } from '@/components/ui/catalog-status-badge';
import { CatalogStatusSelect } from '@/components/ui/catalog-status-select';
import {
  LOCALE_LABELS,
  LOCALE_ORDER,
  initialSlugTouched,
  isDraftComplete,
  toTranslationDrafts,
  type LocaleCode,
  type TranslationDraft,
} from './translations';
import {
  categoriesKeys,
  createCategory,
  deleteCategory,
  publishCategory,
  unpublishCategory,
  updateCategory,
  useCategories,
  useCategory,
  type AdminCategory,
  type TranslationPayload,
} from './queries';
import { adminUrl } from '@/lib/admin-url';

// Convert the editable drafts into the backend translation payload. Locales with
// no name are dropped — an empty translation isn't sent.
function draftsToPayload(drafts: Record<LocaleCode, TranslationDraft>): TranslationPayload[] {
  return LOCALE_ORDER.filter((code) => drafts[code].name.trim().length > 0).map((code) => {
    const d = drafts[code];
    return {
      locale: code,
      name: d.name.trim(),
      slug: d.slug.trim() || toSlug(d.name),
      description: d.description.trim() || null,
      seo_title: d.seoTitle.trim() || null,
      seo_description: d.seoDescription.trim() || null,
      is_complete: isDraftComplete(d),
    };
  });
}

function EditForm({ category, isNew }: { category: AdminCategory | null; isNew: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();
  const [searchParams] = useSearchParams();

  // Whether this form edits a sub-category. Fixed when the form opens: for a new
  // record it comes from the create flow (?type=sub or ?parent=<id>); for an
  // existing record it's whether it already has a parent. Sub-categories get a
  // parent selector + a tile image; top-level categories get neither.
  const isSub = isNew
    ? searchParams.get('type') === 'sub' || !!searchParams.get('parent')
    : !!category?.parentId;
  const typeLabel = isSub ? 'sub-category' : 'category';

  const [locale, setLocale] = useState<LocaleCode>('en');
  const [drafts, setDrafts] = useState<Record<LocaleCode, TranslationDraft>>(() =>
    toTranslationDrafts(category?.translations ?? []),
  );
  // Per-locale "slug manually edited" flags. Existing (non-empty) slugs start
  // touched so we never auto-rewrite a published URL.
  const [slugTouched, setSlugTouched] = useState(() =>
    initialSlugTouched(toTranslationDrafts(category?.translations ?? [])),
  );
  const [parentId, setParentId] = useState(category?.parentId ?? searchParams.get('parent') ?? '');
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? '');
  const [displayOrder, setDisplayOrder] = useState(String(category?.displayOrder ?? ''));
  const [orderTouched, setOrderTouched] = useState(false);
  const [status, setStatus] = useState(category?.status ?? 'draft');

  // A new category appends to the end of its sibling group (1-based) so it never
  // defaults to 0 or collides with an existing row. Recomputed if the parent
  // changes — until the operator edits the field by hand.
  const nextOrder = useMemo(() => {
    const group = categories.filter((c) =>
      isSub ? c.parentId === (parentId || null) : !c.parentId,
    );
    return group.length ? Math.max(...group.map((c) => c.displayOrder)) + 1 : 1;
  }, [categories, isSub, parentId]);

  // Derived (no effect): show the computed end-of-group for an untouched new
  // record, otherwise whatever the operator has typed. A new sub-category has no
  // meaningful position until its parent is chosen, so keep it blank until then.
  const effectiveOrder =
    isNew && !orderTouched ? (isSub && !parentId ? '' : String(nextOrder)) : displayOrder;
  // Inline field errors. `name`/`slug` belong to a specific locale tab
  // (`errors.locale`) so a backend error on, say, the Arabic slug shows on the
  // Arabic tab — not hard-coded to English. `parent` is locale-independent.
  const [errors, setErrors] = useState<{
    name?: string;
    slug?: string;
    parent?: string;
    locale: LocaleCode;
  }>({ locale: 'en' });

  const current = drafts[locale];
  const heading = drafts.en.name || (isNew ? `New ${typeLabel}` : `Untitled ${typeLabel}`);
  const categoryId = category?.id ?? '';

  function updateDraft(field: keyof TranslationDraft, value: string) {
    setDrafts((prev) => {
      const next = { ...prev[locale], [field]: value };
      // Typing the name auto-fills the slug until the operator edits it directly.
      if (field === 'name' && !slugTouched[locale]) {
        next.slug = toSlug(value);
      }
      return { ...prev, [locale]: next };
    });
    // Clear the matching error as the operator fixes the errored locale's field.
    if (locale === errors.locale && field === 'name') setErrors((p) => ({ ...p, name: undefined }));
    if (locale === errors.locale && field === 'name' && !slugTouched[locale]) {
      setErrors((p) => ({ ...p, slug: undefined }));
    }
  }

  function updateSlug(value: string) {
    // A direct slug edit marks this locale touched → stop auto-syncing it.
    // Format live as the operator types so an invalid slug can't be entered.
    setSlugTouched((prev) => ({ ...prev, [locale]: true }));
    setDrafts((prev) => ({ ...prev, [locale]: { ...prev[locale], slug: toSlugLive(value) } }));
    if (locale === errors.locale) setErrors((p) => ({ ...p, slug: undefined }));
  }

  // Final tidy on blur — full toSlug() drops any trailing separator left by
  // mid-word typing (e.g. "test-" → "test").
  function tidySlug() {
    setDrafts((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], slug: toSlug(prev[locale].slug) },
    }));
  }

  const arDir = locale === 'ar' ? 'rtl' : 'ltr';

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: categoriesKeys.all });
    if (category)
      void queryClient.invalidateQueries({ queryKey: categoriesKeys.detail(category.id) });
  };

  // Draft saves anything EXCEPT a nameless record (a name is the minimum
  // identity). The English slug + everything else is enforced at Publish.
  function onSave() {
    // Client-side checks are English-only, so they live on the EN tab.
    const next: { name?: string; slug?: string; parent?: string; locale: LocaleCode } = {
      locale: 'en',
    };
    if (!drafts.en.name.trim()) next.name = 'English name is required.';
    // A sub-category must have a parent — otherwise it would silently save as a
    // top-level category despite the form being framed as a sub-category.
    if (isSub && !parentId) next.parent = 'Choose a parent category for this sub-category.';
    setErrors(next);
    if (next.name || next.slug || next.parent) {
      if (next.name) setLocale('en');
      toast.error('Please fix the highlighted fields.');
      return;
    }
    save.mutate();
  }

  const save = useMutation({
    mutationFn: () => {
      const translations = draftsToPayload(drafts);
      const base = {
        parentId: parentId || null,
        imageUrl: imageUrl.trim() || null,
        displayOrder: Number(effectiveOrder) || (isNew ? nextOrder : 0),
      };
      return isNew
        ? createCategory({ ...base, translations })
        : updateCategory(categoryId, {
            ...base,
            status: status as 'draft' | 'published',
            translations,
          });
    },
    onSuccess: (saved) => {
      toast.success(isNew ? 'Category created' : 'Category saved');
      invalidate();
      if (isNew) navigate(`/categories/${saved.id}`);
    },
    onError: (err) => {
      // The submitted translations array is the drafts filtered to non-empty
      // names (see draftsToPayload), so a Zod path index maps back to that locale.
      const submitted = LOCALE_ORDER.filter((c) => drafts[c].name.trim().length > 0);
      const raw = apiFieldErrors(err, {
        keyFor: (path) => {
          if (path[0] === 'parentId') return 'parent';
          if (
            path[0] === 'translations' &&
            typeof path[1] === 'number' &&
            typeof path[2] === 'string'
          ) {
            // Encode the locale so name/slug errors land on the right tab.
            return `${path[2]}:${submitted[path[1]] ?? 'en'}`;
          }
          return undefined;
        },
      });
      const keys = Object.keys(raw);
      if (keys.length === 0) {
        toast.error(err instanceof ApiError ? err.message : 'Could not save the category.');
        return;
      }
      // The first name/slug error decides which locale tab to open + highlight.
      const fieldKey = keys.find((k) => k !== 'parent');
      if (fieldKey) {
        const loc = fieldKey.split(':')[1] as LocaleCode;
        setErrors({
          locale: loc,
          name: raw[`name:${loc}`],
          slug: raw[`slug:${loc}`],
          parent: raw.parent,
        });
        setLocale(loc);
      } else {
        setErrors({ locale: 'en', parent: raw.parent });
      }
      toast.error('Please fix the highlighted fields.');
    },
  });

  const publish = useMutation({
    mutationFn: () => publishCategory(categoryId),
    onSuccess: () => {
      toast.success('Category published');
      setStatus('published');
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not publish the category.'),
  });

  const unpublish = useMutation({
    mutationFn: () => unpublishCategory(categoryId),
    onSuccess: () => {
      toast.success('Category unpublished');
      setStatus('draft');
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not unpublish the category.'),
  });

  const remove = useMutation({
    mutationFn: () => deleteCategory(categoryId),
    onSuccess: () => {
      toast.success('Category deleted');
      void queryClient.invalidateQueries({ queryKey: categoriesKeys.all });
      navigate('/categories');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not delete the category.'),
  });

  const localeTabs = LOCALE_ORDER.map((code) => ({
    code,
    label: LOCALE_LABELS[code],
    invalid: !isDraftComplete(drafts[code]),
  }));

  const gateLocales = LOCALE_ORDER.map((code) => ({
    code,
    label: code.toUpperCase(),
    complete: isDraftComplete(drafts[code]),
  }));

  const gateChecks = useMemo(
    () => [
      { label: 'English name set', done: drafts.en.name.trim().length > 0 },
      { label: 'English slug set', done: drafts.en.slug.trim().length > 0 },
      { label: `Slug set for ${locale.toUpperCase()}`, done: current.slug.trim().length > 0 },
    ],
    [drafts, current, locale],
  );

  const gateReady = drafts.en.name.trim().length > 0 && drafts.en.slug.trim().length > 0;
  const published = status === 'published';

  // Can't be a parent of itself; only top-level categories are offered as parents.
  const parentOptions = categories.filter((c) => c.id !== category?.id && !c.parentId);

  return (
    <div>
      <nav className="text-muted-foreground mb-4 flex items-center gap-1.5 text-sm">
        <Link to="/categories" className="hover:text-foreground">
          Categories
        </Link>
        <ChevronRight className="size-4 shrink-0" />
        <span className="text-foreground min-w-0 truncate">{heading}</span>
      </nav>

      <PageHeader
        title={heading}
        subtitle={
          isNew
            ? `New ${typeLabel} · not yet saved`
            : `${published ? 'Published' : 'Draft'} ${typeLabel}`
        }
        actions={
          <>
            <Button
              onClick={onSave}
              disabled={save.isPending || !drafts.en.name.trim()}
              title={drafts.en.name.trim() ? undefined : 'Enter a name first'}
            >
              {isNew ? 'Save as draft' : 'Save changes'}
            </Button>
            {/* Preview opens the storefront-style preview in a new tab. Needs a
                saved id, so it's hidden while the record is still new (unsaved). */}
            {!isNew && (
              <Button
                variant="outline"
                onClick={() => window.open(adminUrl(`/preview/category/${categoryId}`), '_blank')}
              >
                <Eye className="size-4" />
                Preview
              </Button>
            )}
          </>
        }
      />

      <TwoCol>
        <div className="flex flex-col gap-[18px]">
          <PublishGate
            ready={gateReady}
            locales={gateLocales}
            activeLocale={locale}
            onLocale={(code) => setLocale(code as LocaleCode)}
            checks={gateChecks}
          />

          {/* Translations */}
          <Panel>
            <PanelHead title="Translations" />
            <PanelBody>
              <LocaleTabs
                tabs={localeTabs}
                value={locale}
                onChange={(code) => setLocale(code as LocaleCode)}
              />

              <Field>
                <FieldLabel required>Category name</FieldLabel>
                <Input
                  dir={arDir}
                  value={current.name}
                  aria-invalid={locale === errors.locale && !!errors.name}
                  onChange={(e) => updateDraft('name', e.target.value)}
                />
                {locale === errors.locale && errors.name && <FieldError>{errors.name}</FieldError>}
                <FieldHelp>Shown as the page heading and in BreadcrumbList JSON-LD.</FieldHelp>
              </Field>

              <Field>
                <FieldLabel required>Slug</FieldLabel>
                <Input
                  dir={arDir}
                  value={current.slug}
                  aria-invalid={locale === errors.locale && !!errors.slug}
                  onChange={(e) => updateSlug(e.target.value)}
                  onBlur={tidySlug}
                />
                {locale === errors.locale && errors.slug && <FieldError>{errors.slug}</FieldError>}
                <FieldHelp>
                  {/* The storefront serves categories at /catalogue/<slug>. */}
                  URL: /{locale}/catalogue/{current.slug || '…'} · lowercase, hyphen-separated.
                </FieldHelp>
              </Field>

              <Field>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  dir={arDir}
                  rows={4}
                  placeholder="What this category covers…"
                  value={current.description}
                  onChange={(e) => updateDraft('description', e.target.value)}
                />
                <FieldHelp>Used as meta description and CollectionPage.description.</FieldHelp>
              </Field>

              <Field>
                <FieldLabel>SEO title override</FieldLabel>
                <Input
                  dir={arDir}
                  placeholder="Auto: name — Tavkil"
                  value={current.seoTitle}
                  onChange={(e) => updateDraft('seoTitle', e.target.value)}
                />
              </Field>

              <Field className="mb-0">
                <FieldLabel>SEO description override</FieldLabel>
                <Input
                  dir={arDir}
                  placeholder="Auto: first 155 chars of description"
                  value={current.seoDescription}
                  onChange={(e) => updateDraft('seoDescription', e.target.value)}
                />
              </Field>
            </PanelBody>
          </Panel>

          {/* Tile image — only sub-categories render a tile on the storefront.
              Top-level categories use a built-in brand icon, so no image here. */}
          {isSub && (
            <Panel>
              <PanelHead
                title="Tile image"
                action={
                  <span className="text-muted-foreground text-xs">
                    Shown on the parent category page
                  </span>
                }
              />
              <PanelBody>
                <Field className="mb-0">
                  <FieldLabel>Tile image</FieldLabel>
                  <SingleImageUpload value={imageUrl} onChange={setImageUrl} size="full" />
                  <FieldHelp>
                    Used as this sub-category&rsquo;s tile in the catalogue and the TYPE filter.
                  </FieldHelp>
                </Field>
              </PanelBody>
            </Panel>
          )}
        </div>

        <RightStack>
          {/* Hierarchy */}
          <Panel>
            <PanelHead title="Hierarchy" />
            <PanelBody>
              {isSub ? (
                <Field>
                  <FieldLabel required>Parent category</FieldLabel>
                  <SelectMenu
                    value={parentId}
                    onValueChange={(v) => {
                      setParentId(v);
                      setErrors((p) => ({ ...p, parent: undefined }));
                    }}
                    placeholder="Select a parent category…"
                    options={parentOptions.map((c) => ({
                      value: c.id,
                      label: c.translations.find((t) => t.locale === 'en')?.name ?? c.id,
                      icon: <CatalogStatusDot status={c.status} />,
                    }))}
                  />
                  {errors.parent && <FieldError>{errors.parent}</FieldError>}
                  <FieldHelp>The top-level category this sub-category lives under.</FieldHelp>
                </Field>
              ) : (
                <Field>
                  <FieldLabel>Placement</FieldLabel>
                  <p className="text-muted-foreground text-[13px]">
                    Top-level category — appears in the main catalogue nav.
                  </p>
                </Field>
              )}

              {(() => {
                // A sub-category's order only exists within its parent group, so
                // the field is disabled until a parent is picked (for a new one).
                const orderDisabled = isNew && isSub && !parentId;
                return (
                  <Field className={isNew ? 'mb-0' : ''}>
                    <FieldLabel>Display order</FieldLabel>
                    <Input
                      type="number"
                      value={effectiveOrder}
                      disabled={orderDisabled}
                      placeholder={orderDisabled ? 'Select a parent first' : undefined}
                      onChange={(e) => {
                        setDisplayOrder(e.target.value);
                        setOrderTouched(true);
                      }}
                    />
                    <FieldHelp>
                      {orderDisabled
                        ? 'Pick a parent category above — the position fills in automatically.'
                        : isSub
                          ? 'Or drag to reorder on the Categories list. Lower = earlier.'
                          : 'Lower = earlier among top-level categories.'}
                    </FieldHelp>
                  </Field>
                );
              })()}

              {!isNew && (
                <Field className="mb-0">
                  <FieldLabel>Status</FieldLabel>
                  <CatalogStatusSelect
                    status={status}
                    statuses={['published', 'draft']}
                    disabled={publish.isPending || unpublish.isPending}
                    onSelect={(next) => {
                      if (next === 'published') {
                        if (!gateReady) {
                          toast.error('Add an English name and slug to publish.');
                          return;
                        }
                        publish.mutate();
                      } else if (next === 'draft') {
                        unpublish.mutate();
                      }
                    }}
                  />
                  <FieldHelp>Publishing runs the publish gate.</FieldHelp>
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
                  Deleting hides this category and all its products from the storefront.
                </p>
                <ConfirmDialog
                  trigger={
                    <Button variant="destructive" size="sm" disabled={remove.isPending}>
                      Delete category
                    </Button>
                  }
                  title="Delete this category?"
                  description="The category will be removed from the storefront. This is a soft delete."
                  confirmLabel="Delete category"
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

export function CategoryEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const { data: category, isLoading } = useCategory(id ?? '', !isNew);

  if (isNew) {
    return <EditForm key="new" category={null} isNew />;
  }

  if (isLoading) {
    return <EditPageSkeleton />;
  }

  if (!category) {
    return <div className="text-muted-foreground p-8">Category not found.</div>;
  }

  // Re-key on id so form defaults reset when navigating between categories.
  return <EditForm key={category.id} category={category} isNew={false} />;
}
