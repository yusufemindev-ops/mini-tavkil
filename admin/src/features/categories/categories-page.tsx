import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  ChevronRight,
  Eye,
  FolderTree,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
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
import { PageHeader } from '@/components/ui/page-header';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { LOCALE_ORDER, LOCALE_SHORT, pickTranslation } from './translations';
import {
  applyReorderToCache,
  categoriesKeys,
  publishCategory,
  unpublishCategory,
  reorderCategories,
  useCategories,
  type AdminCategory,
} from './queries';

// Shared column grid so the header and every row line up. Columns:
// name (flex) · locales · status · actions.
const ROW_COLS = 'grid grid-cols-[minmax(0,1fr)_148px_116px_120px] items-center gap-3';

// Categories only ever sit in draft or published — they're navigation buckets,
// not sellable items, so there's no "archived" retirement state (that lives on
// products). Retiring a category is a future redirect concern, not a status.
// `justify-self-start` so the pill sizes to its content instead of stretching to
// fill the grid column (grid items default to justify-self: stretch).
function StatusBadge({ status }: { status: string }) {
  if (status === 'published')
    return (
      <Badge variant="success" className="justify-self-start">
        Published
      </Badge>
    );
  return (
    <Badge variant="warning" className="justify-self-start">
      Draft
    </Badge>
  );
}

function nameOf(category: AdminCategory): string {
  return pickTranslation(category.translations)?.name || 'Untitled category';
}

// English is the fallback floor (TSC-50): a category can publish with incomplete
// TR/AR (those fall back to English), but never without a usable English name
// slug. Mirrors the edit-page publish gate.
function isEnglishComplete(category: AdminCategory): boolean {
  const en = category.translations.find((t) => t.locale === 'en');
  return !!en && en.name.trim().length > 0 && en.slug.trim().length > 0;
}

function LocaleBadges({ category }: { category: AdminCategory }) {
  return (
    <div className="flex gap-1">
      {LOCALE_ORDER.map((code) => {
        const t = category.translations.find((tr) => tr.locale === code);
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

// Quiet, borderless row actions — identical on parent and sub rows so the column
// scans as a straight line. Preview + Edit are icon-only (native tooltips); only
// the consequential state change (Publish/Unpublish) keeps a word, fixed-width so
// it doesn't jump between the two labels.
const ICON_BTN =
  'text-muted-foreground hover:bg-muted hover:text-foreground grid size-8 place-items-center rounded-md transition-colors';

function RowActions({
  category,
  onEdit,
  onTogglePublish,
  busy,
}: {
  category: AdminCategory;
  onEdit: () => void;
  onTogglePublish: () => void;
  busy: boolean;
}) {
  const published = category.status === 'published';
  const publishLabel = published ? 'Unpublish' : 'Publish';
  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip content="Preview on storefront">
        <button
          type="button"
          aria-label="Preview on storefront"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`/preview/category/${category.id}`, '_blank');
          }}
          className={ICON_BTN}
        >
          <Eye className="size-4" />
        </button>
      </Tooltip>
      <Tooltip content={busy ? `${publishLabel}…` : publishLabel}>
        <button
          type="button"
          aria-label={publishLabel}
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePublish();
          }}
          className={cn(ICON_BTN, 'disabled:pointer-events-none disabled:opacity-60')}
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
      <Tooltip content="Edit">
        <button
          type="button"
          aria-label="Edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className={ICON_BTN}
        >
          <Pencil className="size-4" />
        </button>
      </Tooltip>
    </div>
  );
}

// A draggable sub-category row. Lives inside a per-parent SortableContext so it
// can only be reordered among its siblings.
function SubcategoryRow({
  category,
  position,
  onEdit,
  onTogglePublish,
  busy,
}: {
  category: AdminCategory;
  // 1-based display position among its siblings (matches the drag order).
  position: number;
  onEdit: () => void;
  onTogglePublish: () => void;
  busy: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  // Inline the translate so we don't depend on @dnd-kit/utilities (not a direct
  // dep). Vertical sorting only needs Y, but X keeps it correct if that changes.
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };
  const en = pickTranslation(category.translations);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        ROW_COLS,
        'border-border bg-card border-b px-4 py-2.5',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      <div className="flex min-w-0 items-center gap-2 pl-8">
        <span className="text-muted-foreground/60 w-6 flex-none font-mono text-[11px]">
          #{position}
        </span>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex-none cursor-grab touch-none active:cursor-grabbing"
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0">
          <div className="text-foreground truncate text-[13px] font-medium">{nameOf(category)}</div>
          <div className="text-muted-foreground truncate font-mono text-[11px]">
            /category/{en?.slug ?? '—'}
          </div>
        </div>
      </div>
      <LocaleBadges category={category} />
      <StatusBadge status={category.status} />
      <RowActions
        category={category}
        onEdit={onEdit}
        onTogglePublish={onTogglePublish}
        busy={busy}
      />
    </div>
  );
}

// A draggable top-level category row with its (also draggable) children nested
// inside. Lives in the page-level SortableContext so parents reorder among
// themselves; children get their own per-parent DndContext below.
function ParentRow({
  parent,
  position,
  childrenCats,
  isExpanded,
  onToggleExpand,
  sensors,
  onChildDragEnd,
  onEdit,
  onTogglePublish,
  onEditChild,
  onTogglePublishChild,
  onAddSub,
  busyId,
}: {
  parent: AdminCategory;
  // 1-based display position among top-level categories.
  position: number;
  childrenCats: AdminCategory[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  sensors: ReturnType<typeof useSensors>;
  onChildDragEnd: (event: DragEndEvent) => void;
  onEdit: () => void;
  onTogglePublish: () => void;
  onEditChild: (child: AdminCategory) => void;
  onTogglePublishChild: (child: AdminCategory) => void;
  onAddSub: () => void;
  busyId: string | undefined;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: parent.id,
  });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };
  const en = pickTranslation(parent.translations);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('bg-card', isDragging && 'relative z-20 shadow-lg')}
    >
      {/* Parent row */}
      <div
        className={cn(
          ROW_COLS,
          'border-border hover:bg-muted/30 cursor-pointer border-b px-4 py-3',
          isExpanded && 'bg-muted/20',
        )}
        onClick={onToggleExpand}
      >
        <div className="flex min-w-0 items-center gap-1">
          <span className="text-muted-foreground/60 w-6 flex-none font-mono text-[11px]">
            #{position}
          </span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex-none cursor-grab touch-none active:cursor-grabbing"
            title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse sub-categories' : 'Expand sub-categories'}
            className="text-muted-foreground hover:text-foreground flex-none"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            <ChevronRight
              className={cn('size-4 transition-transform', isExpanded && 'rotate-90')}
            />
          </button>
          <div className="min-w-0">
            <div className="text-foreground truncate text-[13px] font-medium">{nameOf(parent)}</div>
            <div className="text-muted-foreground truncate font-mono text-[11.5px]">
              /category/{en?.slug ?? '—'} · {childrenCats.length} sub
              {childrenCats.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
        <LocaleBadges category={parent} />
        <StatusBadge status={parent.status} />
        <RowActions
          category={parent}
          onEdit={onEdit}
          onTogglePublish={onTogglePublish}
          busy={busyId === parent.id}
        />
      </div>

      {/* Children (draggable among siblings) */}
      {isExpanded && (
        <div className="bg-muted/10">
          {childrenCats.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onChildDragEnd}
            >
              <SortableContext
                items={childrenCats.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {childrenCats.map((child, i) => (
                  <SubcategoryRow
                    key={child.id}
                    category={child}
                    position={i + 1}
                    onEdit={() => onEditChild(child)}
                    onTogglePublish={() => onTogglePublishChild(child)}
                    busy={busyId === child.id}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-muted-foreground border-border border-b px-4 py-2.5 pl-[3.25rem] text-[13px]">
              No sub-categories yet.
            </div>
          )}
          {/* Add sub-category (parent pre-filled) */}
          <button
            type="button"
            onClick={onAddSub}
            className="text-primary hover:bg-muted/40 border-border flex w-full items-center gap-2 border-b px-4 py-2.5 pl-[3.25rem] text-[13px] font-medium"
          >
            <Plus className="size-4" /> Add sub-category
          </button>
        </div>
      )}
    </div>
  );
}

export function CategoriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading, isError, refetch } = useCategories();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const sensors = useSensors(
    // 5px activation distance so a plain click on the grip doesn't start a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const topLevel = categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const subCount = categories.length - topLevel.length;

  function childrenOf(parentId: string): AdminCategory[] {
    return categories
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: categoriesKeys.all });

  const setPublish = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      await (publish ? publishCategory(id) : unpublishCategory(id));
      // Refetch inside the mutation so `isPending` (the row spinner) stays true
      // until the list reflects the new status — the icon then swaps in one step
      // (spinner → updated icon) with no stale-icon flash in between.
      await invalidate();
    },
    onSuccess: (_data, { publish }) => toast.success(publish ? 'Published' : 'Unpublished'),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not change status.'),
  });

  // Persist a new sibling order in ONE atomic request (display_order = index + 1,
  // server-side) instead of a PATCH per row.
  const reorder = useMutation({
    mutationFn: (ordered: AdminCategory[]) => reorderCategories(ordered.map((c) => c.id)),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Could not save the new order.'),
    // Always refetch after settling so the cache reconciles with the server,
    // whether the reorder succeeded or failed.
    onSettled: () => void invalidate(),
  });

  // Reorder a single sibling group (top-level categories, or one parent's
  // children) — same logic for both since each group is sorted independently.
  function reorderSiblings(siblings: AdminCategory[], event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = siblings.findIndex((c) => c.id === active.id);
    const newIndex = siblings.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const ordered = arrayMove(siblings, oldIndex, newIndex);

    // Optimistically reflect the new order in the list AND detail caches so the
    // list doesn't flicker back and the edit page can't read a stale order.
    applyReorderToCache(queryClient, ordered);
    reorder.mutate(ordered);
  }

  const togglePublish = (c: AdminCategory) => {
    const publish = c.status !== 'published';
    // Gate publish on English only — TR/AR fall back to English on the storefront.
    if (publish && !isEnglishComplete(c)) {
      toast.error('Add an English name and slug before publishing.');
      return;
    }
    setPublish.mutate({ id: c.id, publish });
  };
  const busyId = setPublish.isPending ? setPublish.variables?.id : undefined;

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle={`${topLevel.length} categories · ${subCount} sub-categories · Mirror of the public catalog tree`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => window.open('/preview/catalogue', '_blank')}
              disabled={topLevel.length === 0}
            >
              <Eye className="size-4" /> Preview catalogue
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/categories/new?type=sub')}
              disabled={topLevel.length === 0}
            >
              <Plus className="size-4" /> New sub-category
            </Button>
            <Button onClick={() => navigate('/categories/new')}>
              <Plus className="size-4" /> New category
            </Button>
          </>
        }
      />

      <Panel>
        <PanelBody tight>
          {isLoading ? (
            <TableSkeleton
              rows={8}
              columns={[
                { header: 'Category', cell: 'text' },
                { header: 'Locales', cell: 'badges' },
                { header: 'Status', cell: 'badge' },
                { header: 'Actions', cell: 'text' },
              ]}
            />
          ) : isError ? (
            <EmptyState
              icon={<AlertTriangle className="size-6" />}
              title="Couldn't load categories"
              description="Something went wrong while loading the catalog tree. Check your connection and try again."
              action={
                <Button variant="outline" onClick={() => void refetch()}>
                  <RefreshCw className="size-4" /> Retry
                </Button>
              }
            />
          ) : topLevel.length === 0 ? (
            <EmptyState
              icon={<FolderTree className="size-6" />}
              title="No categories yet"
              description="Create your first category to start building the public catalog tree."
              action={
                <Button onClick={() => navigate('/categories/new')}>
                  <Plus className="size-4" /> New category
                </Button>
              }
            />
          ) : (
            <div>
              {/* Column header */}
              <div
                className={cn(
                  ROW_COLS,
                  'border-border text-muted-foreground bg-muted/40 border-b px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide',
                )}
              >
                <div>Category</div>
                <div>Locales</div>
                <div>Status</div>
                <div className="text-end">Actions</div>
              </div>

              {/* Top-level rows are draggable among themselves. */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => reorderSiblings(topLevel, e)}
              >
                <SortableContext
                  items={topLevel.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {topLevel.map((parent, i) => (
                    <ParentRow
                      key={parent.id}
                      parent={parent}
                      position={i + 1}
                      childrenCats={childrenOf(parent.id)}
                      isExpanded={expandedIds.has(parent.id)}
                      onToggleExpand={() => toggleExpanded(parent.id)}
                      sensors={sensors}
                      onChildDragEnd={(e) => reorderSiblings(childrenOf(parent.id), e)}
                      onEdit={() => navigate(`/categories/${parent.id}`)}
                      onTogglePublish={() => togglePublish(parent)}
                      onEditChild={(child) => navigate(`/categories/${child.id}`)}
                      onTogglePublishChild={(child) => togglePublish(child)}
                      onAddSub={() => navigate(`/categories/new?parent=${parent.id}`)}
                      busyId={busyId}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
