import { useRef, useState } from 'react';
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type RowData,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Inbox,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SelectMenu } from '@/components/ui/select-menu';

// Per-column filter UI: a text box (default) or a "joined on/after" date picker.
// (The type params are required to merge with TanStack's ColumnMeta signature.)
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: 'text' | 'date';
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageSize?: number;
  onRowClick?: (row: TData) => void;
}

// Reusable data table on TanStack Table: sortable columns, Ant-style per-column
// search/date filters (icon in the header → dropdown), and a pagination footer.
export function DataTable<TData, TValue>({
  columns,
  data,
  pageSize = 10,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const colCount = table.getVisibleLeafColumns().length;
  const currentPageSize = table.getState().pagination.pageSize;

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-border border-b">
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="bg-muted/40 text-muted-foreground px-3.5 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wide"
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-1">
                          {header.column.getCanSort() ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="hover:text-foreground inline-flex items-center gap-1 uppercase"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {sorted === 'asc' ? (
                                <ChevronUp className="size-3.5" />
                              ) : sorted === 'desc' ? (
                                <ChevronDown className="size-3.5" />
                              ) : (
                                <ChevronsUpDown className="size-3.5 opacity-40" />
                              )}
                            </button>
                          ) : (
                            <span>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </span>
                          )}
                          {header.column.getCanFilter() && <ColumnFilter column={header.column} />}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    'border-border border-b last:border-0',
                    onRowClick && 'hover:bg-muted/30 cursor-pointer',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="h-[53px] px-3.5 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={colCount} style={{ height: currentPageSize * 53 }}>
                  <div className="text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <Inbox className="size-9 opacity-40" strokeWidth={1.5} />
                    <span className="text-[13px]">No results</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer — pagination */}
      <div className="border-border bg-card border-t px-4 py-2.5">
        <DataTablePagination
          pageIndex={table.getState().pagination.pageIndex}
          pageCount={table.getPageCount()}
          pageSize={table.getState().pagination.pageSize}
          rowCount={table.getFilteredRowModel().rows.length}
          canPrevious={table.getCanPreviousPage()}
          canNext={table.getCanNextPage()}
          setPageSize={table.setPageSize}
          setPageIndex={table.setPageIndex}
          previous={table.previousPage}
          next={table.nextPage}
        />
      </div>
    </div>
  );
}

// Ant-style column filter: an icon in the header that opens a small dropdown with
// a search box (text) or a date picker.
function ColumnFilter<TData>({ column }: { column: Column<TData> }) {
  const variant = column.columnDef.meta?.filterVariant;
  const value = (column.getFilterValue() ?? '') as string;
  const active = value !== '';
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Filter ${column.id}`}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'grid size-5 flex-none place-items-center rounded transition-colors',
          active ? 'text-primary' : 'text-muted-foreground/60 hover:text-foreground',
        )}
      >
        {variant === 'date' ? (
          <CalendarDays className="size-3.5" />
        ) : (
          <Search className="size-3.5" />
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2" initialFocus={inputRef}>
        <input
          ref={inputRef}
          type={variant === 'date' ? 'date' : 'text'}
          aria-label={`Filter ${column.id}`}
          placeholder={variant === 'date' ? undefined : 'Search…'}
          value={value}
          onChange={(e) => column.setFilterValue(e.target.value)}
          className="border-input bg-background focus-visible:ring-ring h-8 w-full rounded-md border px-2.5 text-sm normal-case focus-visible:outline-none focus-visible:ring-2"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => column.setFilterValue('')}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Reset
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DataTablePagination({
  pageIndex,
  pageCount,
  pageSize,
  rowCount,
  canPrevious,
  canNext,
  setPageSize,
  setPageIndex,
  previous,
  next,
}: {
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  rowCount: number;
  canPrevious: boolean;
  canNext: boolean;
  setPageSize: (n: number) => void;
  setPageIndex: (n: number) => void;
  previous: () => void;
  next: () => void;
}) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-4 text-[13px]">
      <span>{rowCount} row(s)</span>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex items-center gap-2">
          Rows per page
          <SelectMenu
            value={String(pageSize)}
            onValueChange={(v) => setPageSize(Number(v))}
            className="h-8 w-auto text-xs"
            options={[10, 20, 50].map((n) => ({ value: String(n), label: String(n) }))}
          />
        </label>
        <span>
          Page <strong className="text-foreground">{pageCount === 0 ? 0 : pageIndex + 1}</strong> of{' '}
          <strong className="text-foreground">{pageCount}</strong>
        </span>
        <div className="flex items-center gap-1">
          <PagerBtn disabled={!canPrevious} onClick={() => setPageIndex(0)} label="First page">
            <ChevronsLeft className="size-4" />
          </PagerBtn>
          <PagerBtn disabled={!canPrevious} onClick={previous} label="Previous page">
            <ChevronUp className="size-4 -rotate-90" />
          </PagerBtn>
          <PagerBtn disabled={!canNext} onClick={next} label="Next page">
            <ChevronDown className="size-4 -rotate-90" />
          </PagerBtn>
          <PagerBtn
            disabled={!canNext}
            onClick={() => setPageIndex(pageCount - 1)}
            label="Last page"
          >
            <ChevronsRight className="size-4" />
          </PagerBtn>
        </div>
      </div>
    </div>
  );
}

function PagerBtn({
  children,
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="border-border bg-card text-foreground hover:border-primary hover:text-primary grid size-8 place-items-center rounded-md border transition-colors disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
