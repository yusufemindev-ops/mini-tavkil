import { useParams } from 'react-router';
import { useCategories, type AdminCategory } from '@/features/categories/queries';
import { pickTranslation } from '@/features/categories/translations';
import { useCategoryProducts } from './queries';
import { PreviewChrome } from './preview/preview-chrome';
import { PreviewGrid, type SidebarItem } from './preview/preview-grid';
import { PreviewLoading, PreviewMessage } from './preview/preview-ui';
import { previewNav, previewProducts } from './preview/category-nav';
import { previewSearch, type LocaleCode } from './preview/shared';

// Category display name for `locale`, falling back to English then the id —
// mirrors the storefront's English-fallback rule.
function categoryName(category: AdminCategory, locale: LocaleCode): string {
  return (
    pickTranslation(category.translations, locale)?.name ??
    pickTranslation(category.translations)?.name ??
    category.id
  );
}

// Description for `locale`, falling back to English (mirrors the storefront). An
// empty description → null so the header simply omits the paragraph.
function categoryDescription(category: AdminCategory, locale: LocaleCode): string | null {
  const desc =
    pickTranslation(category.translations, locale)?.description ??
    pickTranslation(category.translations)?.description ??
    '';
  return desc.trim() ? desc : null;
}

// Route: /preview/category/:categoryId — the storefront-style category grid.
// A top-level category aggregates all its sub-categories' published products; a
// sub-category shows just its own. The sidebar lists sibling categories (each a
// link) exactly like the live catalogue. Reached from the Categories page and
// the Products-page sections.
export function CategoryPreviewPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const id = categoryId ?? '';
  // Scoped to this category's subtree (the backend categoryId filter aggregates
  // children), so a top-level preview still shows all its sub-categories' products.
  const { data: products = [], isLoading: productsLoading } = useCategoryProducts(id);
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const isLoading = productsLoading || categoriesLoading;

  const nav = previewNav(categories, id);
  const items = nav ? previewProducts(products, categories, id) : [];

  return (
    <PreviewChrome backTo="/categories" backLabel="Back to categories">
      {({ locale, theme }) => {
        if (isLoading) return <PreviewLoading />;
        if (!nav) return <PreviewMessage>Category not found.</PreviewMessage>;

        const search = previewSearch(locale, theme);
        const allActive = nav.category.id === nav.groupId;
        const sidebar: SidebarItem[] = [
          { label: 'All', to: `/preview/category/${nav.groupId}${search}`, active: allActive },
          ...nav.filters.map((f) => ({
            label: categoryName(f, locale),
            to: `/preview/category/${f.id}${search}`,
            active: f.id === nav.category.id,
            isDraft: f.status !== 'published',
          })),
        ];
        const parentCrumb = nav.parent
          ? {
              label: categoryName(nav.parent, locale),
              to: `/preview/category/${nav.parent.id}${search}`,
            }
          : null;

        return (
          <PreviewGrid
            categoryName={categoryName(nav.category, locale)}
            description={categoryDescription(nav.category, locale)}
            parentCrumb={parentCrumb}
            sidebar={sidebar}
            products={items}
            locale={locale}
            theme={theme}
          />
        );
      }}
    </PreviewChrome>
  );
}
