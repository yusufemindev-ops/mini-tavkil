import { useCategories, type AdminCategory } from '@/features/categories/queries';
import { pickTranslation } from '@/features/categories/translations';
import { PreviewChrome } from './preview/preview-chrome';
import { CataloguePreview, type CatalogueSection } from './preview/catalogue-preview';
import { PreviewLoading } from './preview/preview-ui';
import { previewCatalogue } from './preview/category-nav';
import { previewSearch, type LocaleCode } from './preview/shared';

// Category display name for `locale`, falling back to English then the id.
function categoryName(category: AdminCategory, locale: LocaleCode): string {
  return (
    pickTranslation(category.translations, locale)?.name ??
    pickTranslation(category.translations)?.name ??
    category.id
  );
}

// Route: /preview/catalogue — the storefront catalogue index (CATEGORIES rail
// per-category sections with sub-category tiles). Reached from the "Preview
// catalogue" button on the Categories page. Drafts included + badged.
export function CataloguePreviewPage() {
  const { data: categories = [], isLoading } = useCategories();
  const raw = previewCatalogue(categories);

  return (
    <PreviewChrome backTo="/categories" backLabel="Back to categories">
      {({ locale, theme }) => {
        if (isLoading) return <PreviewLoading />;

        const search = previewSearch(locale, theme);
        const sections: CatalogueSection[] = raw.map((s) => ({
          id: s.category.id,
          name: categoryName(s.category, locale),
          isDraft: s.category.status !== 'published',
          viewAllTo: `/preview/category/${s.category.id}${search}`,
          tiles: s.children.map((c) => ({
            id: c.id,
            name: categoryName(c, locale),
            imageUrl: c.imageUrl,
            isDraft: c.status !== 'published',
            to: `/preview/category/${c.id}${search}`,
          })),
        }));

        return <CataloguePreview sections={sections} locale={locale} />;
      }}
    </PreviewChrome>
  );
}
