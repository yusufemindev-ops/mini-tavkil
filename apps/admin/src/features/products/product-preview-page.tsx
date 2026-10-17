import { useParams } from 'react-router';
import { useProduct } from './queries';
import { PreviewChrome } from './preview/preview-chrome';
import { PreviewDetail } from './preview/preview-detail';
import { PreviewLoading, PreviewMessage } from './preview/preview-ui';
import { previewSearch } from './preview/shared';

// Route: /preview/product/:id — the storefront-style DETAIL preview of one saved
// product. Reached from the product editor's Preview button and from a card in
// the category grid preview.
export function ProductPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const productId = id ?? '';
  const { data: product, isLoading } = useProduct(productId, Boolean(productId));

  return (
    <PreviewChrome backTo={`/products/${productId}`} backLabel="Back to editor">
      {({ locale, theme }) =>
        isLoading ? (
          <PreviewLoading />
        ) : !product ? (
          <PreviewMessage>Product not found.</PreviewMessage>
        ) : (
          <PreviewDetail
            product={product}
            locale={locale}
            catalogueHref={`/preview/catalogue${previewSearch(locale, theme)}`}
            categoryHref={
              product.category
                ? `/preview/category/${product.category.id}${previewSearch(locale, theme)}`
                : undefined
            }
          />
        )
      }
    </PreviewChrome>
  );
}
