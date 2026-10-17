import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';
import {
  AlertTriangle,
  ChevronRight,
  GripVertical,
  Info,
  Loader2,
  Package,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Panel, PanelBody, PanelHead } from '@/components/ui/panel';
import { PageHeader } from '@/components/ui/page-header';
import { SelectMenu } from '@/components/ui/select-menu';
import { EditPageSkeleton } from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { pickTranslation } from '@/features/categories/translations';
import {
  updateCategory,
  useCategory,
  categoriesKeys,
  type SortStrategy,
} from '@/features/categories/queries';
import {
  CATEGORY_PRODUCTS_CAP,
  productsKeys,
  reorderProducts,
  updateProduct,
  useCategoryProducts,
  type AdminProduct,
} from './queries';
import { ProductThumb } from './product-thumb';

const STRATEGY_OPTIONS: { value: SortStrategy; label: string }[] = [
  { value: 'manual', label: 'Manual — drag / type positions' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low → high' },
  { value: 'price_desc', label: 'Price: high → low' },
  { value: 'moq', label: 'Minimum order qty' },
];

function productName(p: AdminProduct): string {
  return p.translations.find((t) => t.locale === 'en')?.name || 'Untitled product';
}

// Client-side mirror of the backend ordering rule so the arrange list previews
// exactly what the storefront shows: featured first, then the strategy, then
// sort_order / created_at as a stable tiebreak.
export function effectiveOrder(products: AdminProduct[], strategy: SortStrategy): AdminProduct[] {
  const price = (p: AdminProduct) => p.basePrice?.amount ?? 0;
  const byStrategy = (a: AdminProduct, b: AdminProduct): number => {
    switch (strategy) {
      case 'newest':
        return b.createdAt.localeCompare(a.createdAt);
      case 'price_asc':
        return price(a) - price(b);
      case 'price_desc':
        return price(b) - price(a);
      case 'moq':
        return a.moq - b.moq;
      default:
        return 0; // manual → sort_order tiebreak below
    }
  };
  return [...products].sort(
    (a, b) =>
      Number(b.isFeatured) - Number(a.isFeatured) ||
      byStrategy(a, b) ||
      a.sortOrder - b.sortOrder ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

function StarButton({
  featured,
  busy,
  onToggle,
}: {
  featured: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <Tooltip content={featured ? 'Featured — click to unpin' : 'Feature (pin to top)'}>
      <button
        type="button"
        aria-label={featured ? 'Unfeature' : 'Feature'}
        aria-pressed={featured}
        disabled={busy}
        onClick={onToggle}
        className={cn(
          'grid size-8 flex-none place-items-center rounded-md transition-colors disabled:opacity-60',
          featured
            ? 'text-accent hover:bg-muted'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Star className="size-4" fill={featured ? 'currentColor' : 'none'} />
        )}
      </button>
    </Tooltip>
  );
}

// Type-a-position input. Remounted (via `key={position}`) whenever the row's
// real position changes, so the draft re-seeds after a drag/move.
function PositionInput({
  position,
  max,
  onCommit,
}: {
  position: number;
  max: number;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(position));
  const commit = () => {
    const n = Number.parseInt(draft, 10);
    if (Number.isNaN(n) || n === position) {
      setDraft(String(position));
      return;
    }
    onCommit(Math.min(Math.max(n, 1), max));
  };
  return (
    <Input
      value={draft}
      aria-label="Position"
      title="Type a position, then press Enter"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        else if (e.key === 'Escape') {
          setDraft(String(position));
          e.currentTarget.blur();
        }
      }}
      className="h-7 w-12 flex-none px-1.5 text-center text-xs tabular-nums"
    />
  );
}

// One product row. In manual mode it carries a drag handle + position input; in
// auto mode it's read-only order. The star toggle is always available.
function ArrangeRow({
  product,
  position,
  manual,
  featuredBusy,
  onFeature,
  onMovePosition,
  max,
}: {
  product: AdminProduct;
  position: number;
  manual: boolean;
  featuredBusy: boolean;
  onFeature: () => void;
  onMovePosition: (n: number) => void;
  max: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
    disabled: !manual,
  });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-border bg-card flex items-center gap-2 border-b px-4 py-2.5',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      {manual ? (
        <>
          <PositionInput key={position} position={position} max={max} onCommit={onMovePosition} />
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex-none cursor-grab touch-none active:cursor-grabbing"
            title="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        </>
      ) : (
        <span className="text-muted-foreground/70 w-8 flex-none text-right font-mono text-xs tabular-nums">
          #{position}
        </span>
      )}
      <ProductThumb product={product} />
      <div className="min-w-0 flex-1">
        <div className="text-foreground flex items-center gap-1.5 truncate text-[13px] font-medium">
          <span className="truncate">{productName(product)}</span>
          {product.isFeatured && <Badge variant="secondary">Featured</Badge>}
        </div>
        <div className="text-muted-foreground truncate font-mono text-[11px]">
          {product.sku ?? '—'}
        </div>
      </div>
      <StarButton featured={product.isFeatured} busy={featuredBusy} onToggle={onFeature} />
    </div>
  );
}

// Route: /products/arrange/:categoryId — merchandise ONE sub-category. Loads only
// its published products (bounded), so drag/position stays usable at scale.
export function ArrangePage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const id = categoryId ?? '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: category, isLoading: categoryLoading } = useCategory(id, id !== '');
  const { data: products = [], isLoading: productsLoading } = useCategoryProducts(id, {
    status: 'published',
  });
  const [featuringId, setFeaturingId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const strategy = category?.sortStrategy ?? 'manual';
  const manual = strategy === 'manual';
  const ordered = useMemo(() => effectiveOrder(products, strategy), [products, strategy]);
  // This view loads at most CATEGORY_PRODUCTS_CAP products; if a sub-category
  // actually holds that many, manual reorder would only cover the shown set — warn
  // rather than silently truncate.
  const truncated = products.length >= CATEGORY_PRODUCTS_CAP;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: productsKeys.all });
    void queryClient.invalidateQueries({ queryKey: categoriesKeys.all });
  };

  const setStrategy = useMutation({
    mutationFn: (next: SortStrategy) => updateCategory(id, { sortStrategy: next }),
    onSuccess: () => invalidate(),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Could not change the sort order.'),
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderProducts(id, ids),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Could not save the new order.'),
    onSettled: () => invalidate(),
  });

  const feature = useMutation({
    mutationFn: ({ pid, isFeatured }: { pid: string; isFeatured: boolean }) =>
      updateProduct(pid, { isFeatured }),
    onMutate: ({ pid }) => setFeaturingId(pid),
    onSuccess: (_d, { isFeatured }) => toast.success(isFeatured ? 'Featured' : 'Unfeatured'),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update.'),
    onSettled: () => {
      setFeaturingId(null);
      invalidate();
    },
  });

  // Persist the manual order — send ALL published ids in the shown order (featured
  // first, so they get the lowest sort_order and pin to the top).
  function persistOrder(next: AdminProduct[]) {
    applyOrderToCache(next);
    reorder.mutate(next.map((p) => p.id));
  }

  // Optimistically write the new order into the scoped cache so it doesn't snap
  // back before the refetch lands.
  function applyOrderToCache(next: AdminProduct[]) {
    const orderById = new Map(next.map((p, i) => [p.id, i + 1]));
    queryClient.setQueryData(
      productsKeys.byCategory(id, 'published'),
      (old: { items: AdminProduct[] } | undefined) =>
        old
          ? {
              ...old,
              items: old.items.map((p) => ({
                ...p,
                sortOrder: orderById.get(p.id) ?? p.sortOrder,
              })),
            }
          : old,
    );
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ordered.findIndex((p) => p.id === active.id);
    const to = ordered.findIndex((p) => p.id === over.id);
    if (from < 0 || to < 0) return;
    persistOrder(arrayMove(ordered, from, to));
  }

  function moveToPosition(pid: string, position: number) {
    const from = ordered.findIndex((p) => p.id === pid);
    if (from < 0) return;
    persistOrder(arrayMove(ordered, from, position - 1));
  }

  if (categoryLoading || productsLoading) return <EditPageSkeleton />;
  if (!category) return <div className="text-muted-foreground p-8">Category not found.</div>;

  const name = pickTranslation(category.translations)?.name ?? category.id;

  return (
    <div className="mx-auto max-w-[880px]">
      <nav className="text-muted-foreground mb-4 flex items-center gap-1.5 text-[13px]">
        <Link to="/products" className="hover:text-foreground">
          Products
        </Link>
        <ChevronRight className="size-3.5 shrink-0" />
        <span className="text-foreground">Arrange · {name}</span>
      </nav>

      <PageHeader
        title={`Arrange — ${name}`}
        subtitle="Set how this sub-category's products are ordered on the storefront."
      />

      <Panel className="mb-4">
        <PanelHead title="Sort strategy" />
        <PanelBody>
          <div className="flex flex-wrap items-center gap-3">
            <SelectMenu
              value={strategy}
              onValueChange={(v) => setStrategy.mutate(v as SortStrategy)}
              options={STRATEGY_OPTIONS}
              className="w-auto"
            />
            <p className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]">
              <Info className="size-3.5 flex-none" />
              {manual
                ? 'Drag or type a position to order. Featured products always pin to the top.'
                : 'Products are ordered automatically. Featured products still pin to the top.'}
            </p>
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHead
          title={`${products.length} published product${products.length === 1 ? '' : 's'}`}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate('/products')}>
              Done
            </Button>
          }
        />
        {truncated && (
          <div className="border-border bg-warning-soft text-warning flex items-start gap-2 border-b px-4 py-2.5 text-[12.5px]">
            <AlertTriangle className="mt-0.5 size-4 flex-none" />
            <span>
              Showing the first {CATEGORY_PRODUCTS_CAP} published products. This sub-category has
              more — {manual ? 'manual reordering here would only cover the shown set, so ' : ''}
              use an automatic sort strategy and Featured pins to merchandise it at this scale.
            </span>
          </div>
        )}
        {products.length === 0 ? (
          <EmptyState
            icon={<Package className="size-6" />}
            title="No published products"
            description="Publish products in this sub-category to arrange their storefront order."
          />
        ) : (
          <div className={cn(reorder.isPending && 'opacity-70')}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={ordered.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {ordered.map((p, i) => (
                  <ArrangeRow
                    key={p.id}
                    product={p}
                    position={i + 1}
                    manual={manual}
                    max={ordered.length}
                    featuredBusy={featuringId === p.id}
                    onFeature={() => feature.mutate({ pid: p.id, isFeatured: !p.isFeatured })}
                    onMovePosition={(n) => moveToPosition(p.id, n)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </Panel>
    </div>
  );
}
