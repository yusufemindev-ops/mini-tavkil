import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ArrowUpDown,
  Eye,
  Loader2,
  Package,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterPills, type FilterPill } from '@/components/ui/filter-pills';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Panel } from '@/components/ui/panel';
import { PageHeader } from '@/components/ui/page-header';
import { SelectMenu } from '@/components/ui/select-menu';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Table } from '@/components/ui/table';
import { CatalogStatusBadge, CatalogStatusDot } from '@/components/ui/catalog-status-badge';
import { cn } from '@/lib/utils';
import { LOCALE_ORDER, LOCALE_SHORT, pickTranslation } from '@/features/categories/translations';
import { useCategories } from '@/features/categories/queries';
import { useSuppliers } from '@/features/suppliers/queries';
import { initialSupplierFilter } from './filter';
import { ProductThumb } from './product-thumb';
import {
  productsKeys,
  publishProduct,
  unpublishProduct,
  useProductCounts,
  useProductList,
  type AdminProduct,
  type ProductListParams,
  type ProductPageResult,
  type ProductSort,
} from './queries';
import { adminUrl } from '@/lib/admin-url';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

type StatusFilter = 'all' | 'published' | 'draft' | 'archived';

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'recent', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'sku', label: 'SKU (A–Z)' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
];

// Publish toggle wired at the page root, consumed by every row via context.
const PublishToggleContext = createContext<{
  onToggle: (product: AdminProduct) => void;
  isPending: (id: string) => boolean;
}>({
  onToggle: () => {
    /* replaced by the page-root provider */
  },
  isPending: () => false,
});

function PublishToggle({ product }: { product: AdminProduct }) {
  const { onToggle, isPending } = useContext(PublishToggleContext);
  const busy = isPending(product.id);
  const published = product.status === 'published';
  const label = published ? 'Unpublish' : 'Publish';
  return (
    <Tooltip content={busy ? `${label}…` : label}>
      <button
        type="button"
        aria-label={label}
        disabled={busy}
        onClick={() => onToggle(product)}
        className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-8 flex-none place-items-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : published ? (
          <ToggleRight className="text-success size-4" />
        ) : (
          <ToggleLeft className="size-4" />
        )}
      </button>
    </Tooltip>
  );
}

function basePriceLabel(p: AdminProduct): string {
  if (!p.basePrice) return '—';
  const currency = p.basePrice.currency ?? '';
  return `${p.basePrice.amount.toFixed(2)} ${currency}`.trim();
}

function LocaleBadges({ product }: { product: AdminProduct }) {
  return (
    <div className="flex gap-1">
      {LOCALE_ORDER.map((code) => {
        const t = product.translations.find((tr) => tr.locale === code);
        return (
          <Badge
            key={code}
            variant={t?.isComplete ? 'success' : 'destructive'}
            title={`${code} ${t?.isComplete ? 'complete' : 'incomplete'}`}
          >
            {LOCALE_SHORT[code]}
          </Badge>
        );
      })}
    </div>
  );
}

export function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [supplier, setSupplier] = useState(() =>
    initialSupplierFilter(searchParams.get('supplier')),
  );
  const [categoryId, setCategoryId] = useState('all');
  const [sort, setSort] = useState<ProductSort>('recent');
  const [page, setPage] = useState(1);
  // Ids with a publish/unpublish request in flight (per-row spinners).
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Shared filter params (minus status/page) drive both the list and the counts.
  const baseParams = useMemo(
    () => ({
      search: search || undefined,
      categoryId: categoryId === 'all' ? undefined : categoryId,
      supplierId: supplier === 'all' ? undefined : supplier,
    }),
    [search, categoryId, supplier],
  );

  const listParams: ProductListParams = {
    ...baseParams,
    status: status === 'all' ? undefined : status,
    sort,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data: pageData, isLoading, isFetching } = useProductList(listParams);
  const { data: counts } = useProductCounts(baseParams);

  const products = pageData?.items ?? [];
  const total = pageData?.total ?? 0;

  const pills: FilterPill[] = [
    { value: 'all', label: 'All', count: counts?.all },
    { value: 'published', label: 'Published', count: counts?.published },
    { value: 'draft', label: 'Draft', count: counts?.draft },
    { value: 'archived', label: 'Archived', count: counts?.archived },
  ];

  const supplierOptions = useMemo(
    () => [
      { value: 'all', label: 'All suppliers' },
      ...suppliers.map((s) => ({
        value: s.id,
        label: pickTranslation(s.translations)?.name ?? s.id,
      })),
    ],
    [suppliers],
  );

  // Category filter: top-level categories, each followed by its sub-categories
  // (indented). Products attach to sub-categories; a top-level filter aggregates.
  // Products attach to sub-categories (leaf nodes), never top-level buckets, so
  // this is a Sub-category filter: list the sub-categories only (grouped by their
  // parent's order so a parent's children stay together), no top-level options.
  const categoryOptions = useMemo(() => {
    const tops = categories
      .filter((c) => !c.parentId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const opts: { value: string; label: string }[] = [
      { value: 'all', label: 'All sub-categories' },
    ];
    for (const top of tops) {
      categories
        .filter((c) => c.parentId === top.id)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .forEach((sub) =>
          opts.push({ value: sub.id, label: pickTranslation(sub.translations)?.name ?? sub.id }),
        );
    }
    return opts;
  }, [categories]);

  const markPending = (id: string, on: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const setPublish = useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      publish ? publishProduct(id) : unpublishProduct(id),
    // Optimistically flip the row's status across every cached list page so the
    // click is instant; the settle-time invalidate reconciles (and corrects a
    // publish-gate rejection).
    onMutate: async ({ id, publish }) => {
      markPending(id, true);
      await queryClient.cancelQueries({ queryKey: productsKeys.all });
      queryClient.setQueriesData<ProductPageResult>({ queryKey: ['products', 'list'] }, (old) =>
        old
          ? {
              ...old,
              items: old.items.map((p) =>
                p.id === id ? { ...p, status: publish ? 'published' : 'draft' } : p,
              ),
            }
          : old,
      );
    },
    onSuccess: (_data, { publish }) => toast.success(publish ? 'Published' : 'Unpublished'),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not change status.'),
    onSettled: (_data, _err, { id }) => {
      markPending(id, false);
      void queryClient.invalidateQueries({ queryKey: productsKeys.all });
    },
  });

  const toggleActions = {
    onToggle: (product: AdminProduct) =>
      setPublish.mutate({ id: product.id, publish: product.status !== 'published' }),
    isPending: (id: string) => pendingIds.has(id),
  };

  const anyFilter = status !== 'all' || search !== '' || categoryId !== 'all' || supplier !== 'all';
  // Arrange (merchandising) is per leaf sub-category — offered only when one is
  // selected in the filter (products attach to sub-categories, not top levels).
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const arrangeCategoryId = selectedCategory?.parentId ? selectedCategory.id : null;

  return (
    <PublishToggleContext.Provider value={toggleActions}>
      <PageHeader
        title="Products"
        subtitle={`${counts?.all ?? 0} total · ${counts?.published ?? 0} published · ${counts?.draft ?? 0} draft`}
        actions={
          <Button onClick={() => navigate('/products/new')}>
            <Plus className="size-4" />
            New product
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterPills
          pills={pills}
          value={status}
          onChange={(v) => {
            setStatus(v as StatusFilter);
            setPage(1);
          }}
          className="mb-0"
        />
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <Input
            type="search"
            placeholder="Search name, SKU, supplier…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-9 w-[240px]"
          />
          <SelectMenu
            value={categoryId}
            onValueChange={(v) => {
              setCategoryId(v);
              setPage(1);
            }}
            className="h-9 w-auto"
            options={categoryOptions}
          />
          <SelectMenu
            value={supplier}
            onValueChange={(v) => {
              setSupplier(v);
              setPage(1);
            }}
            className="h-9 w-auto"
            options={supplierOptions}
          />
          <SelectMenu
            value={sort}
            onValueChange={(v) => {
              setSort(v as ProductSort);
              setPage(1);
            }}
            className="h-9 w-auto"
            options={SORT_OPTIONS}
          />
          {arrangeCategoryId && (
            <Button
              variant="outline"
              className="h-9"
              onClick={() => navigate(`/products/arrange/${arrangeCategoryId}`)}
            >
              <ArrowUpDown className="size-4" />
              Arrange
            </Button>
          )}
        </div>
      </div>

      <Panel>
        {isLoading ? (
          <TableSkeleton
            rows={12}
            columns={[
              { header: 'Product', cell: 'avatar', className: 'w-2/5' },
              { header: 'SKU', cell: 'code' },
              { header: 'Category', cell: 'badge' },
              { header: 'Base price', cell: 'number' },
              { header: 'Status', cell: 'badge' },
              { header: 'Locales', cell: 'badges' },
            ]}
          />
        ) : total === 0 ? (
          <EmptyState
            icon={<Package className="size-6" />}
            title={anyFilter ? 'No products match your filters' : 'No products yet'}
            description={
              anyFilter
                ? 'Try a different search, category, supplier, or status.'
                : 'Create your first product, then publish it to show it on the storefront.'
            }
            action={
              anyFilter ? undefined : (
                <Button onClick={() => navigate('/products/new')}>
                  <Plus className="size-4" /> New product
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
              <Table>
                <thead>
                  <tr>
                    <th className="w-2/5">Product</th>
                    <th>SKU</th>
                    <th>Sub-category</th>
                    <th>Base price</th>
                    <th>Status</th>
                    <th>Locales</th>
                    <th className="w-28 !text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const en = pickTranslation(p.translations);
                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <ProductThumb product={p} />
                            <div className="min-w-0">
                              <div className="text-foreground flex items-center gap-1.5 font-medium">
                                <span className="truncate">{en?.name || 'Untitled product'}</span>
                                {p.isFeatured && (
                                  <Badge variant="secondary" title="Featured in its category">
                                    Featured
                                  </Badge>
                                )}
                              </div>
                              <div className="text-muted-foreground text-[11.5px]">
                                {p.supplier?.name ?? '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <code className="text-muted-foreground font-mono text-xs">
                            {p.sku ?? '—'}
                          </code>
                        </td>
                        <td>
                          {p.category ? (
                            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                              <CatalogStatusDot status={p.status} />
                              {p.category.name ?? '—'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td>
                          <span className="text-muted-foreground text-xs">{basePriceLabel(p)}</span>
                        </td>
                        <td>
                          <CatalogStatusBadge status={p.status} />
                        </td>
                        <td>
                          <LocaleBadges product={p} />
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip content="Preview product">
                              <button
                                type="button"
                                aria-label="Preview product"
                                onClick={() =>
                                  window.open(adminUrl(`/preview/product/${p.id}`), '_blank')
                                }
                                className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-8 place-items-center rounded-md transition-colors"
                              >
                                <Eye className="size-4" />
                              </button>
                            </Tooltip>
                            <PublishToggle product={p} />
                            <Tooltip content="Edit">
                              <button
                                type="button"
                                aria-label="Edit"
                                onClick={() => navigate(`/products/${p.id}`)}
                                className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-8 place-items-center rounded-md transition-colors"
                              >
                                <Pencil className="size-4" />
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
            <div className="px-2 pb-2">
              <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
            </div>
          </>
        )}
      </Panel>
    </PublishToggleContext.Provider>
  );
}
