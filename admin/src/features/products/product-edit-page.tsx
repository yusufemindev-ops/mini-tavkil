import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Eye, Info, Plus, Star, Wand2, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { CountrySelect } from '@/components/ui/country-select';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldHelp, FieldLabel, FormRow, FormRow3 } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tooltip } from '@/components/ui/tooltip';
import { LocaleTabs } from '@/components/ui/locale-tabs';
import { PageHeader } from '@/components/ui/page-header';
import { Panel, PanelBody, PanelHead } from '@/components/ui/panel';
import { PublishGate, type GateCheck } from '@/components/ui/publish-gate';
import { SelectMenu } from '@/components/ui/select-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EditPageSkeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ImageDropzone } from '@/components/ui/media-upload';
import { ProductOptionsEditor } from './product-options-editor';
import { ProductVariantsEditor } from './product-variants-editor';
import { CatalogStatusDot } from '@/components/ui/catalog-status-badge';
import { CatalogStatusSelect } from '@/components/ui/catalog-status-select';
import { optionsToPayload, toOptionDrafts, type OptionDraft } from './options';
import { cartesian, syncVariantRows, toVariantRows, variantRowsToPayload } from './variants';
import { moveToPosition, positionOf, publishedSiblings } from './ordering';
import { RightStack, TwoCol } from '@/components/ui/two-col';
import { cn } from '@/lib/utils';
import { toSlug, toSlugLive } from '@/lib/slug';
import { ApiError } from '@/lib/api/client';
import { apiFieldErrors } from '@/lib/api/field-errors';
import { useCategories } from '@/features/categories/queries';
import { useSuppliers } from '@/features/suppliers/queries';
import { pickTranslation } from '@/features/categories/translations';
import {
  archiveProduct,
  createProduct,
  deleteProduct,
  productsKeys,
  publishProduct,
  reorderProducts,
  restoreProduct,
  unpublishProduct,
  updateProduct,
  useCategoryProducts,
  useProduct,
  type AdminProduct,
  type ProductAttributePayload,
  type ProductImagePayload,
  type ProductTranslationPayload,
  type ProductVariantPayload,
} from './queries';

type LocaleCode = 'en' | 'tr' | 'ar';

const LOCALE_ORDER: LocaleCode[] = ['en', 'tr', 'ar'];
const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: 'English',
  tr: 'Türkçe',
  ar: 'العربية',
};

const UNIT_OPTIONS = ['piece', 'pack', 'box', 'set', 'kg', 'liter', 'meter'].map((u) => ({
  value: u,
  label: u,
}));

// Small "?" info icon next to a field label, revealing an explanation on hover.
function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip content={text}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="More info"
        onClick={(e) => e.preventDefault()}
        className="text-muted-foreground hover:text-foreground ms-1 inline-flex translate-y-[1px] align-middle"
      >
        <Info className="size-3.5" />
      </button>
    </Tooltip>
  );
}

const STOREFRONT_BASE_URL = import.meta.env.VITE_STOREFRONT_BASE_URL ?? '';

interface TranslationDraft {
  name: string;
  slug: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
}

interface AttributeDraft {
  key: string;
  name: string;
  value: string;
}

interface ImageDraft {
  key: string;
  url: string;
  alt: string;
  isPrimary: boolean;
}

let rowSeq = 0;
const nextKey = () => `row-${rowSeq++}`;

function emptyTranslation(): TranslationDraft {
  return { name: '', slug: '', description: '', seoTitle: '', seoDescription: '' };
}

function toTranslationDrafts(product: AdminProduct | null): Record<LocaleCode, TranslationDraft> {
  const drafts: Record<LocaleCode, TranslationDraft> = {
    en: emptyTranslation(),
    tr: emptyTranslation(),
    ar: emptyTranslation(),
  };
  for (const code of LOCALE_ORDER) {
    const t = product?.translations.find((tr) => tr.locale === code);
    if (t) {
      drafts[code] = {
        name: t.name,
        slug: t.slug,
        description: t.description ?? '',
        seoTitle: t.seoTitle ?? '',
        seoDescription: t.seoDescription ?? '',
      };
    }
  }
  return drafts;
}

// Per-locale "slug manually edited" flags. On load, treat any locale whose slug
// is already non-empty as touched so we never auto-rewrite an existing URL.
function initialSlugTouched(
  drafts: Record<LocaleCode, TranslationDraft>,
): Record<LocaleCode, boolean> {
  return {
    en: drafts.en.slug.trim().length > 0,
    tr: drafts.tr.slug.trim().length > 0,
    ar: drafts.ar.slug.trim().length > 0,
  };
}

// Attributes are per-locale in the backend. We keep one draft list per locale.
function toAttributeDrafts(product: AdminProduct | null): Record<LocaleCode, AttributeDraft[]> {
  const drafts: Record<LocaleCode, AttributeDraft[]> = { en: [], tr: [], ar: [] };
  for (const a of product?.attributes ?? []) {
    const code = a.locale as LocaleCode;
    if (drafts[code]) drafts[code].push({ key: nextKey(), name: a.name, value: a.value });
  }
  return drafts;
}

function toImageDrafts(product: AdminProduct | null): ImageDraft[] {
  return (product?.images ?? []).map((i) => ({
    key: nextKey(),
    url: i.url,
    alt: i.alt ?? '',
    isPrimary: i.isPrimary,
  }));
}

function isTranslationComplete(d: TranslationDraft): boolean {
  return d.name.trim().length > 0 && d.slug.trim().length > 0;
}

// Append newly-uploaded image URLs as rows. The first image overall must be the
// primary one — so if nothing is primary yet, the first appended row claims it.
export function appendImageRows(existing: ImageDraft[], urls: string[]): ImageDraft[] {
  let hasPrimary = existing.some((i) => i.isPrimary);
  const rows = urls.map((url) => {
    const isPrimary = !hasPrimary;
    hasPrimary = true;
    return { key: nextKey(), url, alt: '', isPrimary };
  });
  return [...existing, ...rows];
}

// Inline field errors. `name`/`slug` belong to a specific locale tab
// (`errors.locale`) so a backend error on the Arabic slug shows on the Arabic tab
// — not hard-coded to English. The rest are locale-independent single fields.
interface ProductErrors {
  name?: string;
  slug?: string;
  sku?: string;
  categoryId?: string;
  supplierId?: string;
  basePriceAmount?: string;
  gtin13?: string;
  locale: LocaleCode;
}

// Locale-independent fields (rendered outside the translation tabs).
const PRODUCT_FIELD_KEYS = ['sku', 'categoryId', 'supplierId', 'basePriceAmount'] as const;

function ProductEditForm({ product, isNew }: { product: AdminProduct | null; isNew: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();

  const [locale, setLocale] = useState<LocaleCode>('en');
  const [status, setStatus] = useState(product?.status ?? 'draft');
  const [translations, setTranslations] = useState(() => toTranslationDrafts(product));
  // Per-locale "slug manually edited" flags. Existing (non-empty) slugs start
  // touched so we never auto-rewrite a published product URL.
  const [slugTouched, setSlugTouched] = useState(() =>
    initialSlugTouched(toTranslationDrafts(product)),
  );
  const [attributes, setAttributes] = useState(() => toAttributeDrafts(product));
  const [images, setImages] = useState(() => toImageDrafts(product));
  // Selectable options/variants (Color, Thickness, …) — loaded from + saved to
  // the backend.
  const [options, setOptions] = useState(() => toOptionDrafts(product?.options ?? []));
  // Priced-variant grid rows (TSC-64) — one per combination of option values.
  // Seeded from the product's variants, merged onto the full cartesian set so
  // every current combination has a row (prices preserved by value-key match).
  const [variantRows, setVariantRows] = useState(() =>
    syncVariantRows(toOptionDrafts(product?.options ?? []), toVariantRows(product)),
  );
  // Editing options must not wipe entered variant prices: re-sync the grid on
  // every options change, matching rows by their value-key set (adds new combos,
  // drops removed ones, keeps prices).
  function updateOptions(next: OptionDraft[]) {
    setOptions(next);
    setVariantRows((rows) => syncVariantRows(next, rows));
  }
  // A product with ≥1 named option (with ≥1 value) is priced per variant via the
  // grid; otherwise it uses the single base-price field.
  const hasVariantGrid = cartesian(options).length > 0;
  // Publish readiness for priced products: every ACTIVE variant needs a price.
  const activeVariantsPriced =
    variantRows.length > 0 &&
    variantRows
      .filter((r) => r.active)
      .every((r) => r.price.trim().length > 0 && Number(r.price) > 0);

  const [categoryId, setCategoryId] = useState(product?.category?.id ?? '');
  // Siblings for the display-order input: the CURRENTLY-selected sub-category's
  // published products (re-fetched if the operator changes the sub-category).
  // Scoped, not the whole catalog.
  const { data: allProducts = [] } = useCategoryProducts(categoryId, { status: 'published' });
  const [supplierId, setSupplierId] = useState(product?.supplier?.id ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [moq, setMoq] = useState(String(product?.moq ?? 1));
  const [boxQuantity, setBoxQuantity] = useState(
    product?.boxQuantity != null ? String(product.boxQuantity) : '',
  );
  const [packSize, setPackSize] = useState(
    product?.packSize != null ? String(product.packSize) : '',
  );
  const [weightKg, setWeightKg] = useState(
    product?.weightKg != null ? String(product.weightKg) : '',
  );
  const [cbm, setCbm] = useState(product?.cbm != null ? String(product.cbm) : '');
  const [unit, setUnit] = useState(product?.unit ?? 'piece');
  const [brandName, setBrandName] = useState(product?.brandName ?? '');
  const [countryOfOrigin, setCountryOfOrigin] = useState(product?.countryOfOrigin ?? '');
  const [mpn, setMpn] = useState(product?.mpn ?? '');
  const [gtin13, setGtin13] = useState(product?.gtin13 ?? '');
  const [basePriceAmount, setBasePriceAmount] = useState(
    product?.basePrice ? String(product.basePrice.amount) : '',
  );
  // Locked to the base currency (USD) — every price is stored in USD (Pattern A).
  const [basePriceCurrency] = useState(product?.basePrice?.currency ?? 'USD');
  const [errors, setErrors] = useState<ProductErrors>({ locale: 'en' });
  const clearError = (key: keyof ProductErrors) =>
    setErrors((prev) => ({ ...prev, [key]: undefined }));

  const current = translations[locale];
  const title = translations.en.name || (isNew ? 'New product' : 'Untitled product');
  // Minimum to save a draft: an English product name (its identity).
  const hasName = translations.en.name.trim().length > 0;
  const published = status === 'published';
  const productId = product?.id ?? '';

  // Display order — a storefront "position" only exists for a published product,
  // ranked among the published products in its sub-category. Hidden for
  // drafts/archived/new (they have no position). The input is seeded from the
  // live position and re-syncs whenever it changes (e.g. after a save reorder).
  const siblings = useMemo(
    () => publishedSiblings(allProducts, categoryId),
    [allProducts, categoryId],
  );
  const currentPosition = positionOf(siblings, productId);
  const showDisplayOrder = published && !!categoryId && !isNew;
  const [positionDraft, setPositionDraft] = useState(currentPosition);
  const [lastPosition, setLastPosition] = useState(currentPosition);
  if (currentPosition !== lastPosition) {
    setLastPosition(currentPosition);
    setPositionDraft(currentPosition);
  }
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const categoryName = selectedCategory
    ? (pickTranslation(selectedCategory.translations)?.name ?? 'this sub-category')
    : 'this sub-category';

  function updateTranslation(field: keyof TranslationDraft, value: string) {
    setTranslations((prev) => {
      const next = { ...prev[locale], [field]: value };
      // Typing the name auto-fills the slug until the operator edits it directly.
      if (field === 'name' && !slugTouched[locale]) {
        next.slug = toSlug(value);
      }
      return { ...prev, [locale]: next };
    });
    // Clear the errored locale's inline errors as the operator fixes them.
    if (locale === errors.locale && field === 'name') {
      setErrors((p) => ({
        ...p,
        name: undefined,
        ...(slugTouched[locale] ? {} : { slug: undefined }),
      }));
    }
  }

  function updateSlug(value: string) {
    // A direct slug edit marks this locale touched → stop auto-syncing it.
    // Format live as the operator types so an invalid slug can't be entered.
    setSlugTouched((prev) => ({ ...prev, [locale]: true }));
    setTranslations((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], slug: toSlugLive(value) },
    }));
    if (locale === errors.locale) setErrors((p) => ({ ...p, slug: undefined }));
  }

  // Final tidy on blur — full toSlug() drops any trailing separator left by
  // mid-word typing (e.g. "test-" → "test").
  function tidySlug() {
    setTranslations((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], slug: toSlug(prev[locale].slug) },
    }));
  }

  const arDir = locale === 'ar' ? 'rtl' : 'ltr';

  function addAttribute() {
    setAttributes((prev) => ({
      ...prev,
      [locale]: [...prev[locale], { key: nextKey(), name: '', value: '' }],
    }));
  }

  function updateAttribute(key: string, field: 'name' | 'value', value: string) {
    setAttributes((prev) => ({
      ...prev,
      [locale]: prev[locale].map((a) => (a.key === key ? { ...a, [field]: value } : a)),
    }));
  }

  function removeAttribute(key: string) {
    setAttributes((prev) => ({
      ...prev,
      [locale]: prev[locale].filter((a) => a.key !== key),
    }));
  }

  function addUploadedImages(urls: string[]) {
    setImages((prev) => appendImageRows(prev, urls));
  }

  function updateImage(key: string, field: 'alt', value: string) {
    setImages((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)));
  }

  function setPrimary(key: string) {
    setImages((prev) => prev.map((i) => ({ ...i, isPrimary: i.key === key })));
  }

  function removeImage(key: string) {
    setImages((prev) => prev.filter((i) => i.key !== key));
  }

  // ── Build the API payload from the editable drafts ──────────────────────────
  function buildTranslations(): ProductTranslationPayload[] {
    return LOCALE_ORDER.filter((code) => translations[code].name.trim().length > 0).map((code) => {
      const d = translations[code];
      return {
        locale: code,
        name: d.name.trim(),
        // Fall back to a slug derived from the name so a name-only draft still
        // produces a valid (regex-passing) slug for the backend.
        slug: d.slug.trim() || toSlug(d.name),
        description: d.description.trim() || null,
        seo_title: d.seoTitle.trim() || null,
        seo_description: d.seoDescription.trim() || null,
        is_complete: isTranslationComplete(d),
      };
    });
  }

  function buildAttributes(): ProductAttributePayload[] {
    const out: ProductAttributePayload[] = [];
    for (const code of LOCALE_ORDER) {
      attributes[code]
        .filter((a) => a.name.trim() && a.value.trim())
        .forEach((a, idx) => {
          out.push({ locale: code, name: a.name.trim(), value: a.value.trim(), sortOrder: idx });
        });
    }
    return out;
  }

  function buildImages(): ProductImagePayload[] {
    return images
      .filter((i) => i.url.trim())
      .map((i, idx) => ({
        url: i.url.trim(),
        alt: i.alt.trim() || undefined,
        isPrimary: i.isPrimary,
        sortOrder: idx,
      }));
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: productsKeys.all });
    if (product) void queryClient.invalidateQueries({ queryKey: productsKeys.detail(product.id) });
  };

  // Client-side validation mirroring the backend create schema. Required to
  // create: SKU, category, supplier, and the English name + slug. Optional
  // fields only error when non-empty (they're sent as null otherwise).
  // When true, a new product opens its preview right after the draft is created
  // (the "Preview" button on a brand-new product: save-then-preview).
  const previewAfterSave = useRef(false);

  function onSave(preview = false) {
    previewAfterSave.current = preview;
    // Draft saves anything EXCEPT a nameless product — a name is the minimum
    // identity (empty products cause "Untitled" rows + broken previews).
    // EVERYTHING else — a half-typed GTIN, a bad price, a missing SKU/category —
    // is allowed in a draft and only enforced at Publish (the publish gate). An
    // invalid price is dropped to null in the payload so the backend accepts it.
    const next: ProductErrors = { locale: 'en' };
    if (!translations.en.name.trim()) next.name = 'Product name is required.';
    setErrors(next);
    if (next.name) {
      setLocale('en');
      toast.error('Enter a product name to save a draft.');
      return;
    }
    save.mutate();
  }

  const save = useMutation({
    mutationFn: () => {
      // A draft may hold an invalid/empty price; only a valid non-negative number
      // is sent (else null) so the backend never rejects the save. Publish
      // requires a real price via the gate.
      const priceStr = basePriceAmount.trim();
      const priceNum = Number(priceStr);
      const priceAmount =
        priceStr !== '' && !Number.isNaN(priceNum) && priceNum >= 0 ? priceNum : null;
      const base = {
        // Empty → null so a draft with no category/supplier/SKU passes the
        // backend (it rejects '' as a non-uuid).
        categoryId: categoryId || null,
        supplierId: supplierId || null,
        sku: sku.trim() || null,
        moq: Number(moq) || 1,
        boxQuantity: boxQuantity.trim() === '' ? null : Number(boxQuantity),
        packSize: packSize.trim() === '' ? null : Number(packSize),
        weightKg: weightKg.trim() === '' ? null : Number(weightKg),
        cbm: cbm.trim() === '' ? null : Number(cbm),
        unit,
        brandName: brandName.trim() || null,
        countryOfOrigin: countryOfOrigin || null,
        mpn: mpn.trim() || null,
        gtin13: gtin13.trim() || null,
        basePriceAmount: priceAmount,
        basePriceCurrency: priceAmount == null ? null : basePriceCurrency,
      };
      const translationsPayload = buildTranslations();
      const attributesPayload = buildAttributes();
      const imagesPayload = buildImages();
      const optionsPayload = optionsToPayload(options);
      // Variants (TSC-64): a priced product emits one variant per grid row (synced
      // to the current options so it always matches optionsPayload's value keys);
      // a simple product emits ONE default variant built from the base-price
      // fields. Always sent alongside options.
      const variantsPayload: ProductVariantPayload[] = hasVariantGrid
        ? variantRowsToPayload(syncVariantRows(options, variantRows))
        : [
            {
              isDefault: true,
              basePriceAmount: priceAmount,
              basePriceCurrency: priceAmount == null ? null : basePriceCurrency,
              moq: Number(moq) || 1,
              packSize: packSize.trim() === '' ? null : Number(packSize),
              sku: sku.trim() || null,
            },
          ];
      return isNew
        ? createProduct({
            ...base,
            translations: translationsPayload,
            attributes: attributesPayload,
            images: imagesPayload,
            options: optionsPayload,
            variants: variantsPayload,
          })
        : updateProduct(productId, {
            ...base,
            status: status as 'draft' | 'published' | 'archived',
            translations: translationsPayload,
            attributes: attributesPayload,
            images: imagesPayload,
            options: optionsPayload,
            variants: variantsPayload,
          });
    },
    onSuccess: (saved) => {
      toast.success(isNew ? 'Product created' : 'Product saved');
      // Apply a new display order once the product itself is saved. Only for an
      // already-published product whose position actually changed.
      if (showDisplayOrder && positionDraft !== currentPosition) {
        const ids = moveToPosition(siblings, productId, positionDraft);
        void reorderProducts(categoryId, ids)
          .then(() => invalidate())
          .catch(() => toast.error('Product saved, but the display order could not be updated.'));
      }
      invalidate();
      // New product: go to its editor, or straight to the preview if the user
      // clicked "Preview" (save-then-preview). Existing products stay put.
      if (isNew) {
        navigate(
          previewAfterSave.current ? `/preview/product/${saved.id}` : `/products/${saved.id}`,
        );
      }
      previewAfterSave.current = false;
    },
    onError: (err) => {
      // The submitted translations array is the drafts filtered to non-empty
      // names (see buildTranslations), so a Zod path index maps back to its locale.
      const submitted = LOCALE_ORDER.filter((c) => translations[c].name.trim().length > 0);
      const raw = apiFieldErrors(err, {
        keyFor: (path) => {
          if (
            path[0] === 'translations' &&
            typeof path[1] === 'number' &&
            typeof path[2] === 'string'
          ) {
            // Encode the locale so name/slug errors land on the right tab.
            return `${path[2]}:${submitted[path[1]] ?? 'en'}`;
          }
          for (let i = path.length - 1; i >= 0; i--) {
            if (typeof path[i] === 'string') return path[i] as string;
          }
          return undefined;
        },
      });
      if (Object.keys(raw).length === 0) {
        toast.error(err instanceof ApiError ? err.message : 'Could not save the product.');
        return;
      }
      // Locale-independent fields (SKU, price, category, supplier) apply regardless
      // of the active tab.
      const next: ProductErrors = { locale: errors.locale };
      for (const k of PRODUCT_FIELD_KEYS) if (raw[k]) next[k] = raw[k];
      // A name/slug error is locale-scoped — open the first offending tab.
      const transKey = Object.keys(raw).find((k) => k.startsWith('name:') || k.startsWith('slug:'));
      if (transKey) {
        const loc = transKey.split(':')[1] as LocaleCode;
        next.locale = loc;
        next.name = raw[`name:${loc}`];
        next.slug = raw[`slug:${loc}`];
        setLocale(loc);
      }
      setErrors(next);
      toast.error('Please fix the highlighted fields.');
    },
  });

  const publish = useMutation({
    mutationFn: () => publishProduct(productId),
    onSuccess: () => {
      toast.success('Product published');
      setStatus('published');
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not publish the product.'),
  });

  const unpublish = useMutation({
    mutationFn: () => unpublishProduct(productId),
    onSuccess: () => {
      toast.success('Product unpublished');
      setStatus('draft');
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not unpublish the product.'),
  });

  const archive = useMutation({
    mutationFn: () => archiveProduct(productId),
    onSuccess: () => {
      toast.success('Product archived');
      setStatus('archived');
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not archive the product.'),
  });

  const restore = useMutation({
    mutationFn: () => restoreProduct(productId),
    onSuccess: () => {
      toast.success('Product restored to draft');
      setStatus('draft');
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not restore the product.'),
  });

  const remove = useMutation({
    mutationFn: () => deleteProduct(productId),
    onSuccess: () => {
      toast.success('Product deleted');
      void queryClient.invalidateQueries({ queryKey: productsKeys.all });
      navigate('/products');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not delete the product.'),
  });

  const localeTabs = LOCALE_ORDER.map((code) => ({
    code,
    label: LOCALE_LABELS[code],
    invalid: !isTranslationComplete(translations[code]),
  }));

  const gateLocales = LOCALE_ORDER.map((code) => ({
    code,
    label: code.toUpperCase(),
    complete: isTranslationComplete(translations[code]),
  }));

  const checks: GateCheck[] = useMemo(() => {
    const en = translations.en;
    return [
      { label: 'English name set', done: en.name.trim().length > 0 },
      { label: 'English slug set', done: en.slug.trim().length > 0 },
      { label: 'SKU set', done: sku.trim().length > 0 },
      { label: 'Category + supplier set', done: !!categoryId && !!supplierId },
      // Priced products are gated on every active variant having a price; simple
      // products on the single base price.
      hasVariantGrid
        ? { label: 'All active variants priced', done: activeVariantsPriced }
        : {
            label: 'Base price set',
            done: basePriceAmount.trim().length > 0 && Number(basePriceAmount) > 0,
          },
      { label: 'At least one image', done: images.some((i) => i.url.trim().length > 0) },
      // GTIN is optional — but if one was started, it must be a full 13 digits
      // before publishing (it feeds JSON-LD / Google Shopping).
      ...(gtin13 !== '' ? [{ label: 'GTIN is 13 digits', done: gtin13.length === 13 }] : []),
    ];
  }, [
    translations,
    sku,
    categoryId,
    supplierId,
    basePriceAmount,
    images,
    gtin13,
    hasVariantGrid,
    activeVariantsPriced,
  ]);

  const ready = checks.every((c) => c.done);

  // Products live under sub-categories (leaf nodes), never top-level buckets —
  // mirrors the storefront, where products are listed under sub-category tiles.
  const categoryOptions = categories
    .filter((c) => c.parentId)
    .map((c) => ({
      value: c.id,
      label: pickTranslation(c.translations)?.name ?? c.id,
      icon: <CatalogStatusDot status={c.status} />,
    }));
  // Auto-generate the SKU from the selected category (your own scheme), e.g.
  // "IND-4821". Editable afterwards; random suffix keeps collisions unlikely.
  function generateSku() {
    const catName = categoryOptions.find((o) => o.value === categoryId)?.label ?? '';
    const prefix =
      catName
        .replace(/[^a-zA-Z]/g, '')
        .slice(0, 3)
        .toUpperCase() || 'PRD';
    setSku(`${prefix}-${Math.floor(1000 + Math.random() * 9000)}`);
    clearError('sku');
  }

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: pickTranslation(s.translations)?.name ?? s.id,
    icon: <CatalogStatusDot status={s.status} />,
  }));

  const localeAttributes = attributes[locale];

  const storefrontUrl = `${STOREFRONT_BASE_URL}/${locale}/product/${
    current.slug || translations.en.slug || 'new-product'
  }`;

  return (
    <div className="mx-auto max-w-[1280px]">
      <nav className="text-muted-foreground mb-4 flex items-center gap-1.5 text-[13px]">
        <Link to="/products" className="hover:text-foreground">
          Products
        </Link>
        <ChevronRight className="size-3.5 shrink-0" />
        <span className="text-foreground min-w-0 truncate">{title}</span>
      </nav>

      <PageHeader
        title={title}
        subtitle={sku ? `SKU ${sku}` : 'Not yet saved'}
        actions={
          <>
            <Button
              onClick={() => onSave()}
              disabled={save.isPending || !hasName}
              title={hasName ? undefined : 'Enter a product name first'}
            >
              {status === 'draft' ? 'Save as draft' : 'Save changes'}
            </Button>
            {/* Preview: a saved product opens straight in a new tab; a brand-new
                one saves as a draft first, then navigates to its preview. Needs a
                name (a new product must be saved before its preview can load). */}
            <Button
              variant="outline"
              disabled={save.isPending || (isNew && !hasName)}
              title={isNew && !hasName ? 'Enter a product name first' : undefined}
              onClick={() =>
                isNew ? onSave(true) : window.open(`/preview/product/${productId}`, '_blank')
              }
            >
              <Eye className="size-4" />
              Preview
            </Button>
          </>
        }
      />

      <TwoCol>
        <div className="flex flex-col gap-[18px]">
          {/* 1. Publish gate */}
          <PublishGate
            ready={ready}
            locales={gateLocales}
            activeLocale={locale}
            onLocale={(c) => setLocale(c as LocaleCode)}
            checks={checks}
          />

          {/* 2. Translations + per-language content (everything that changes per language) */}
          <Panel>
            <PanelHead title="Translations & attributes" />
            <PanelBody>
              <LocaleTabs
                tabs={localeTabs}
                value={locale}
                onChange={(c) => setLocale(c as LocaleCode)}
              />
              <Field>
                <FieldLabel required>Product name</FieldLabel>
                <Input
                  dir={arDir}
                  value={current.name}
                  aria-invalid={locale === errors.locale && !!errors.name}
                  onChange={(e) => updateTranslation('name', e.target.value)}
                />
                {locale === errors.locale && errors.name && <FieldError>{errors.name}</FieldError>}
                <FieldHelp>
                  Shown as the H1 on the public product page and in JSON-LD Product.name.
                </FieldHelp>
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
                  URL: /{locale}/product/{current.slug || '…'} · lowercase, hyphen-separated.
                </FieldHelp>
              </Field>
              <Field>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  dir={arDir}
                  rows={6}
                  className="min-h-[140px]"
                  value={current.description}
                  onChange={(e) => updateTranslation('description', e.target.value)}
                />
                <FieldHelp>Used as meta description and JSON-LD Product.description.</FieldHelp>
              </Field>
              <Field>
                <FieldLabel>SEO title</FieldLabel>
                <Input
                  dir={arDir}
                  placeholder="Auto: name + category — Tavkil"
                  value={current.seoTitle}
                  onChange={(e) => updateTranslation('seoTitle', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>SEO description</FieldLabel>
                <Input
                  dir={arDir}
                  placeholder="Auto: First 155 chars of description"
                  value={current.seoDescription}
                  onChange={(e) => updateTranslation('seoDescription', e.target.value)}
                />
              </Field>

              {/* Technical attributes — per language, so grouped here under the
                  same locale tabs (feeds JSON-LD additionalProperty[]). */}
              <div className="border-border mt-1 border-t pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-foreground text-sm font-semibold">
                    Technical attributes — {LOCALE_LABELS[locale]}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Feeds JSON-LD additionalProperty[]
                  </span>
                </div>
                <div className="text-muted-foreground bg-muted/50 mb-2 flex gap-2 rounded px-3 py-2 text-[11px] font-semibold uppercase tracking-wide">
                  <div className="flex-1">Attribute name</div>
                  <div className="flex-1">Value</div>
                  <div className="w-9" />
                </div>
                <div className="flex flex-col gap-2">
                  {localeAttributes.map((a) => (
                    <div key={a.key} className="flex items-center gap-2">
                      <Input
                        dir={arDir}
                        value={a.name}
                        onChange={(e) => updateAttribute(a.key, 'name', e.target.value)}
                        placeholder="Attribute name"
                        className="flex-1"
                      />
                      <Input
                        dir={arDir}
                        value={a.value}
                        onChange={(e) => updateAttribute(a.key, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 flex-none"
                        title="Remove"
                        onClick={() => removeAttribute(a.key)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  {localeAttributes.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      No attributes for {LOCALE_LABELS[locale]} yet.
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" className="mt-3" onClick={addAttribute}>
                  <Plus className="size-3.5" />
                  Add attribute
                </Button>
              </div>
            </PanelBody>
          </Panel>

          {/* 3. Structured data */}
          <Panel>
            <PanelHead title="Structured data (feeds JSON-LD)" />
            <PanelBody>
              <FormRow>
                <Field>
                  <FieldLabel
                    required
                    info={
                      <InfoTip text="A unique code you assign to identify this product for stock and ordering. Must be unique across the catalog." />
                    }
                  >
                    SKU
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      value={sku}
                      aria-invalid={!!errors.sku}
                      onChange={(e) => {
                        setSku(e.target.value);
                        clearError('sku');
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-none"
                      title="Auto-generate from category"
                      onClick={generateSku}
                    >
                      <Wand2 className="size-3.5" />
                      Auto
                    </Button>
                  </div>
                  {errors.sku && <FieldError>{errors.sku}</FieldError>}
                  <FieldHelp>Unique. Required for inventory + JSON-LD Product.sku.</FieldHelp>
                </Field>
                <Field>
                  <FieldLabel>Brand name</FieldLabel>
                  <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} />
                  <FieldHelp>
                    Set only when the product has a manufacturer brand distinct from its supplier.
                  </FieldHelp>
                </Field>
              </FormRow>
              <FormRow3 className="mb-0">
                <Field className="mb-0">
                  <FieldLabel
                    info={
                      <InfoTip text="Where the product is made. Select a supplier first — it auto-fills from the supplier's country and stays editable." />
                    }
                  >
                    Country of origin
                  </FieldLabel>
                  <CountrySelect
                    value={countryOfOrigin}
                    onChange={setCountryOfOrigin}
                    locale="en"
                    variant="country"
                    clearable
                    placeholder="— None"
                    searchPlaceholder="Search country"
                    emptyText="No match"
                  />
                  <FieldHelp>
                    Inherited from the supplier — change only if this product differs.
                  </FieldHelp>
                </Field>
                <Field className="mb-0">
                  <FieldLabel
                    info={
                      <InfoTip text="Manufacturer Part Number — the factory's own code. Leave blank if it's the same as your SKU." />
                    }
                  >
                    MPN
                  </FieldLabel>
                  <Input
                    placeholder="Manufacturer part #"
                    value={mpn}
                    onChange={(e) => setMpn(e.target.value)}
                  />
                  <FieldHelp>The factory&apos;s part number — for re-ordering.</FieldHelp>
                </Field>
                <Field className="mb-0">
                  <FieldLabel
                    info={
                      <InfoTip text="The product's barcode number (EAN / GTIN-13, 13 digits). Feeds JSON-LD and Google Shopping." />
                    }
                  >
                    GTIN
                  </FieldLabel>
                  <Input
                    inputMode="numeric"
                    placeholder="13-digit barcode"
                    value={gtin13}
                    aria-invalid={!!errors.gtin13}
                    onChange={(e) => {
                      // Keep digits only, cap at 13 (GTIN-13 / EAN-13).
                      setGtin13(e.target.value.replace(/\D/g, '').slice(0, 13));
                      clearError('gtin13');
                    }}
                  />
                  {errors.gtin13 && <FieldError>{errors.gtin13}</FieldError>}
                  <FieldHelp>Barcode (EAN/GTIN-13) → JSON-LD Product.gtin13.</FieldHelp>
                </Field>
              </FormRow3>
            </PanelBody>
          </Panel>

          {/* 4. Inventory + price */}
          <Panel>
            <PanelHead title="Inventory & pricing" />
            <PanelBody>
              <FormRow3>
                <Field>
                  <FieldLabel
                    required
                    info={<InfoTip text="The fewest units a buyer is allowed to order at once." />}
                  >
                    Minimum order qty (MOQ)
                  </FieldLabel>
                  <Input type="number" value={moq} onChange={(e) => setMoq(e.target.value)} />
                </Field>
                <Field>
                  <FieldLabel
                    info={<InfoTip text="How many units are in one shipping box (koli içi)." />}
                  >
                    Box quantity
                  </FieldLabel>
                  <Input
                    type="number"
                    value={boxQuantity}
                    onChange={(e) => setBoxQuantity(e.target.value)}
                  />
                  <FieldHelp>Units per shipping box.</FieldHelp>
                </Field>
                <Field>
                  <FieldLabel
                    required
                    info={
                      <InfoTip text="How the product is sold. Use 'pack' for multiples of the same item (a 3-pack) and set 'Items per pack'; 'set' for different items grouped together." />
                    }
                  >
                    Unit
                  </FieldLabel>
                  <SelectMenu
                    value={unit}
                    onValueChange={(u) => {
                      setUnit(u);
                      // "Items per pack" only applies to a pack — clear it otherwise.
                      if (u !== 'pack') setPackSize('');
                    }}
                    options={UNIT_OPTIONS}
                  />
                </Field>
              </FormRow3>
              <div
                className={cn(
                  'grid grid-cols-1 gap-3.5',
                  unit === 'pack' ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
                )}
              >
                {unit === 'pack' && (
                  <Field className="mb-0">
                    <FieldLabel
                      info={
                        <InfoTip text="Items in one sellable unit, e.g. a 3-pack = 3. Leave blank for single items." />
                      }
                    >
                      Items per pack
                    </FieldLabel>
                    <Input
                      type="number"
                      min="1"
                      placeholder="—"
                      value={packSize}
                      onChange={(e) => setPackSize(e.target.value)}
                    />
                    <FieldHelp>Shows as “1 pack (N pcs)” on the storefront.</FieldHelp>
                  </Field>
                )}
                <Field className="mb-0">
                  <FieldLabel>Weight (KG)</FieldLabel>
                  <Input
                    type="number"
                    step="0.001"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                  />
                  <FieldHelp>Gross weight per unit — for freight.</FieldHelp>
                </Field>
                <Field className="mb-0">
                  <FieldLabel>Volume (CBM)</FieldLabel>
                  <Input
                    type="number"
                    step="0.0001"
                    value={cbm}
                    onChange={(e) => setCbm(e.target.value)}
                  />
                  <FieldHelp>Cubic meters per unit — for freight/container loading.</FieldHelp>
                </Field>
              </div>
              {hasVariantGrid ? (
                <div className="text-muted-foreground bg-muted/50 mb-0 rounded px-3 py-2.5 text-[13px]">
                  This product is priced per variant — set each variant&apos;s price in{' '}
                  <span className="text-foreground font-medium">Options &amp; variants</span> below.
                </div>
              ) : (
                <FormRow className="mb-0">
                  <Field className="mb-0">
                    <FieldLabel
                      required
                      info={
                        <InfoTip text="Internal cost — never shown to anonymous visitors. Buyers see base × (1 + tier markup %)." />
                      }
                    >
                      Base price
                    </FieldLabel>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={basePriceAmount}
                      aria-invalid={!!errors.basePriceAmount}
                      onChange={(e) => {
                        setBasePriceAmount(e.target.value);
                        clearError('basePriceAmount');
                      }}
                    />
                    {errors.basePriceAmount && <FieldError>{errors.basePriceAmount}</FieldError>}
                    <FieldHelp>Buyer sees base × (1 + tier markup %).</FieldHelp>
                  </Field>
                  <Field className="mb-0">
                    <FieldLabel>Currency</FieldLabel>
                    <Input value={basePriceCurrency} readOnly disabled />
                    <FieldHelp>
                      Base currency — all prices are stored in USD (
                      <Link to="/settings/currencies" className="text-primary hover:underline">
                        Settings → Currencies
                      </Link>
                      ).
                    </FieldHelp>
                  </Field>
                </FormRow>
              )}
            </PanelBody>
          </Panel>

          {/* 5. Images (uploaded) */}
          <Panel>
            <PanelHead
              title="Images"
              action={
                <span className="text-muted-foreground text-xs">
                  Upload image files · ≥ 1 required to publish
                </span>
              }
            />
            <PanelBody>
              <div className="flex flex-col gap-2.5">
                {images.map((img) => (
                  <div
                    key={img.key}
                    className="border-border flex flex-col gap-2 rounded-md border p-2.5 sm:flex-row sm:items-center"
                  >
                    <img
                      src={img.url}
                      alt={img.alt}
                      className="border-border size-14 flex-none rounded-md border object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('size-9 flex-none', img.isPrimary && 'text-accent')}
                      title={img.isPrimary ? 'Primary image' : 'Set as primary'}
                      onClick={() => setPrimary(img.key)}
                    >
                      <Star className="size-4" fill={img.isPrimary ? 'currentColor' : 'none'} />
                    </Button>
                    <Input
                      value={img.alt}
                      onChange={(e) => updateImage(img.key, 'alt', e.target.value)}
                      placeholder="Alt text (for SEO & accessibility)"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 flex-none"
                      title="Remove"
                      onClick={() => removeImage(img.key)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
                {images.length === 0 && (
                  <p className="text-muted-foreground text-sm">No images yet.</p>
                )}
              </div>
              <div className="mt-3">
                <ImageDropzone
                  multiple
                  title="Drag & drop or click to add images"
                  onUploaded={addUploadedImages}
                />
              </div>
            </PanelBody>
          </Panel>

          {/* 7. Selectable options / variants (Color, Thickness, …) */}
          <Panel>
            <PanelHead
              title="Options & variants"
              action={
                <span className="text-muted-foreground text-xs">
                  Buyer-selectable · priced per variant
                </span>
              }
            />
            <PanelBody>
              <ProductOptionsEditor options={options} onChange={updateOptions} />
              {hasVariantGrid && (
                <div className="border-border mt-4 border-t pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-foreground text-sm font-semibold">Variant pricing</span>
                    <span className="text-muted-foreground text-xs">
                      One row per option combination
                    </span>
                  </div>
                  <ProductVariantsEditor
                    options={options}
                    rows={variantRows}
                    onChange={setVariantRows}
                    onSync={() => setVariantRows((rows) => syncVariantRows(options, rows))}
                  />
                </div>
              )}
            </PanelBody>
          </Panel>
        </div>

        {/* Right rail */}
        <RightStack>
          {!isNew && (
            <Panel>
              <PanelHead title="Status" />
              <PanelBody>
                <Field className="mb-0">
                  <CatalogStatusSelect
                    status={status}
                    statuses={['published', 'draft', 'archived']}
                    disabled={
                      publish.isPending ||
                      unpublish.isPending ||
                      archive.isPending ||
                      restore.isPending
                    }
                    onSelect={(next) => {
                      if (next === 'published') {
                        if (!ready) {
                          toast.error('Complete the publish checklist first.');
                          return;
                        }
                        publish.mutate();
                      } else if (next === 'draft') {
                        if (status === 'archived') restore.mutate();
                        else unpublish.mutate();
                      } else if (next === 'archived') {
                        archive.mutate();
                      }
                    }}
                  />
                  <FieldHelp>Publishing runs the publish gate.</FieldHelp>
                </Field>
              </PanelBody>
            </Panel>
          )}
          <Panel>
            <PanelHead title="Sub-category" />
            <PanelBody>
              <Field className="mb-0">
                <FieldLabel required>Sub-category</FieldLabel>
                <SelectMenu
                  value={categoryId}
                  onValueChange={(v) => {
                    setCategoryId(v);
                    clearError('categoryId');
                  }}
                  options={categoryOptions}
                  placeholder="Select a sub-category…"
                  emptyMessage="No sub-categories yet — create one first."
                />
                {errors.categoryId && <FieldError>{errors.categoryId}</FieldError>}
                <FieldHelp>
                  Products are listed under a sub-category, not a top-level category.
                </FieldHelp>
              </Field>
            </PanelBody>
          </Panel>

          {showDisplayOrder && (
            <Panel>
              <PanelHead title="Display order" />
              <PanelBody>
                <Field className="mb-0">
                  <FieldLabel>Position on storefront</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    max={siblings.length}
                    value={positionDraft === 0 ? '' : String(positionDraft)}
                    onChange={(e) => setPositionDraft(Number.parseInt(e.target.value, 10) || 0)}
                    className="w-24 tabular-nums"
                  />
                  <FieldHelp>
                    Position {currentPosition} of {siblings.length} published in {categoryName}.
                    Save to apply.
                  </FieldHelp>
                </Field>
              </PanelBody>
            </Panel>
          )}

          <Panel>
            <PanelHead title="Supplier" />
            <PanelBody>
              <Field className="mb-0">
                <FieldLabel required>Supplier</FieldLabel>
                <SelectMenu
                  value={supplierId}
                  onValueChange={(v) => {
                    setSupplierId(v);
                    clearError('supplierId');
                    // Inherit the supplier's country into Country of origin, but
                    // only when it's still blank — never overwrite a manual value.
                    if (!countryOfOrigin) {
                      const sup = suppliers.find((s) => s.id === v);
                      if (sup) setCountryOfOrigin(sup.countryCode);
                    }
                  }}
                  options={supplierOptions}
                  placeholder="Select a supplier…"
                  emptyMessage="No suppliers yet — create one first."
                />
                {errors.supplierId && <FieldError>{errors.supplierId}</FieldError>}
                <FieldHelp>
                  <strong>Internal field — never shown publicly.</strong> Links the product to its
                  manufacturer.
                </FieldHelp>
              </Field>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHead title="Live preview" />
            <PanelBody>
              <div className="text-muted-foreground mb-2 flex items-center gap-1 text-xs">
                Storefront URL:
                {!published && (
                  <InfoTip text="The live storefront only shows published products — publish this product to open its live page. Use the Preview button above to see it before publishing." />
                )}
              </div>
              {published ? (
                <a
                  href={storefrontUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary break-all text-[12.5px] hover:underline"
                >
                  {storefrontUrl.replace(/^https?:\/\//, '')}
                </a>
              ) : (
                // Draft/new products 404 on the storefront (not published), so the
                // link is inert until published.
                <span className="text-muted-foreground/60 cursor-not-allowed break-all text-[12.5px]">
                  {storefrontUrl.replace(/^https?:\/\//, '')}
                </span>
              )}
            </PanelBody>
          </Panel>

          {!isNew && (
            <Panel className="border-destructive/20">
              <PanelHead
                title={<span className="text-destructive">Danger zone</span>}
                className="border-destructive/20"
              />
              <PanelBody>
                <div className="text-muted-foreground mb-3 text-[13px]">
                  Deleting hides the product from the storefront and removes it from search.
                </div>
                <ConfirmDialog
                  trigger={
                    <Button variant="destructive" size="sm" disabled={remove.isPending}>
                      Delete product
                    </Button>
                  }
                  title="Delete this product?"
                  description="The product will be removed from the storefront. This is a soft delete."
                  confirmLabel="Delete product"
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

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const { data, isLoading } = useProduct(id ?? '', !isNew);

  if (isNew) {
    return <ProductEditForm key="new" product={null} isNew />;
  }

  if (isLoading) {
    return <EditPageSkeleton />;
  }

  if (!data) {
    return <div className="text-muted-foreground p-8">Product not found.</div>;
  }

  return <ProductEditForm key={data.id} product={data} isNew={false} />;
}
