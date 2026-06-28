"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  isFixedColumnKey,
  isLeadingFixedColumnKey,
  isTrailingFixedColumnKey,
  loadColumnOrder,
  loadHiddenColumnKeys,
  loadPageSize,
  saveColumnOrder,
  saveHiddenColumnKeys,
  savePageSize,
} from "@/lib/table-column-visibility";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type ColumnAlign = "left" | "center" | "right";
export type TableDensity = "default" | "compact" | "comfortable";
type SortDirection = "asc" | "desc";

export interface Column<T extends object> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: ColumnAlign;
  sticky?: boolean;
  /** Hide column below this breakpoint (table-cell display). */
  hideBelow?: "sm" | "md" | "lg";
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  /** When false, column cannot be hidden via the Columns menu. Default: true except actions. */
  hideable?: boolean;
}

interface DataTableProps<T extends object> {
  data: T[];
  columns: Column<T>[];
  /** Unique id for persisting column visibility (required). */
  tableId: string;
  searchKey?: keyof T & string;
  searchFilter?: (row: T, query: string) => boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** When true, shows a loading state instead of the empty message. */
  isLoading?: boolean;
  loadingMessage?: string;
  filterContent?: React.ReactNode;
  filtersActive?: boolean;
  onClearFilters?: () => void;
  density?: TableDensity;
  tableClassName?: string;
  showResultCount?: boolean;
  isRowMuted?: (row: T) => boolean;
  /** Prepends a fixed Sr. No. column reflecting filtered/sorted row order. Default: true */
  showSerialNumber?: boolean;
  /** Enables page size selector and pagination controls. Default: true */
  pagination?: boolean;
  /** Initial rows per page when pagination is enabled. Default: 25 */
  defaultPageSize?: number;
  serialHeader?: string;
}

const alignClass: Record<ColumnAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const densityStyles: Record<
  TableDensity,
  { cell: string; head: string; row: string }
> = {
  compact: { cell: "px-3 py-2", head: "h-10 px-3", row: "text-sm" },
  default: { cell: "px-4 py-3", head: "h-11 px-4", row: "text-sm" },
  comfortable: { cell: "px-4 py-3.5", head: "h-12 px-4", row: "text-sm" },
};

const hideBelowClass = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
} as const;

/** Keeps column headers visible while scrolling the table body. */
const STICKY_HEAD_CLASS =
  "sticky top-0 z-20 bg-muted/95 shadow-[0_1px_0_0_hsl(var(--border))] backdrop-blur supports-[backdrop-filter]:bg-muted/80";

/** Toolbar sticks below the app header when the page scrolls. */
const STICKY_TOOLBAR_CLASS =
  "sticky top-16 z-30 border-b bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80";

const SERIAL_COLUMN_KEY = "srNo";

function isColumnSortable<T extends object>(col: Column<T>): boolean {
  if (col.sortable === false) return false;
  if (isFixedColumnKey(col.key)) return false;
  if (!col.header.trim()) return false;
  return true;
}

function isColumnHideable<T extends object>(col: Column<T>): boolean {
  if (col.hideable === false) return false;
  if (isFixedColumnKey(col.key)) return false;
  if (!col.header.trim()) return false;
  return true;
}

function isColumnReorderable<T extends object>(col: Column<T>): boolean {
  if (isFixedColumnKey(col.key)) return false;
  if (!col.header.trim()) return false;
  return true;
}

function getSortValue<T extends object>(row: T, col: Column<T>): string | number {
  if (col.sortValue) return col.sortValue(row);
  const raw = (row as Record<string, unknown>)[col.key];
  if (raw == null) return "";
  if (typeof raw === "number") return raw;
  if (typeof raw === "boolean") return raw ? 1 : 0;
  if (Array.isArray(raw)) return raw.length;
  return String(raw);
}

function compareSortValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;

  const aStr = String(a);
  const bStr = String(b);
  const aDate = Date.parse(aStr);
  const bDate = Date.parse(bStr);
  if (
    !Number.isNaN(aDate) &&
    !Number.isNaN(bDate) &&
    /^\d{4}-\d{2}-\d{2}/.test(aStr) &&
    /^\d{4}-\d{2}-\d{2}/.test(bStr)
  ) {
    return aDate - bDate;
  }

  return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: "base" });
}

export function DataTable<T extends object>({
  data,
  columns,
  tableId,
  searchKey,
  searchFilter,
  searchPlaceholder = "Search...",
  emptyMessage = "No records found",
  isLoading = false,
  loadingMessage = "Loading records…",
  filterContent,
  filtersActive = false,
  onClearFilters,
  density = "comfortable",
  tableClassName,
  showResultCount = true,
  isRowMuted,
  showSerialNumber = true,
  pagination = true,
  defaultPageSize = DEFAULT_PAGE_SIZE,
  serialHeader = "Sr. No.",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(
    null
  );
  const [page, setPage] = useState(1);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const userColumns = useMemo(
    () => columns.filter((col) => col.key !== SERIAL_COLUMN_KEY),
    [columns]
  );

  const serialColumn = useMemo<Column<T>>(
    () => ({
      key: SERIAL_COLUMN_KEY,
      header: serialHeader,
      align: "center",
      sortable: false,
      hideable: false,
      className: "w-[72px] whitespace-nowrap text-muted-foreground tabular-nums",
    }),
    [serialHeader]
  );

  const hideableColumns = useMemo(
    () => userColumns.filter((col) => isColumnHideable(col)),
    [userColumns]
  );

  const reorderableColumns = useMemo(
    () => userColumns.filter((col) => isColumnReorderable(col)),
    [userColumns]
  );

  const hideableKeys = useMemo(
    () => hideableColumns.map((col) => col.key),
    [hideableColumns]
  );

  const defaultColumnOrder = useMemo(
    () => reorderableColumns.map((col) => col.key),
    [reorderableColumns]
  );

  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => new Set());
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnOrder);
  const [columnsReady, setColumnsReady] = useState(false);

  const hideableKeysKey = hideableKeys.join("|");
  const defaultColumnOrderKey = defaultColumnOrder.join("|");

  useEffect(() => {
    setHiddenKeys(loadHiddenColumnKeys(tableId, hideableKeys));
    setColumnOrder(loadColumnOrder(tableId, defaultColumnOrder));
    setPageSize(loadPageSize(tableId) || defaultPageSize);
    setColumnsReady(true);
  }, [tableId, hideableKeys, defaultColumnOrder, defaultPageSize, hideableKeysKey, defaultColumnOrderKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filtersActive, sort?.key, sort?.direction, data, pageSize]);

  useEffect(() => {
    if (!columnsReady || hideableKeys.length === 0) return;
    const timer = window.setTimeout(() => {
      saveHiddenColumnKeys(tableId, hiddenKeys);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [tableId, hiddenKeys, hideableKeys.length, columnsReady]);

  useEffect(() => {
    if (!columnsReady || defaultColumnOrder.length === 0) return;
    const timer = window.setTimeout(() => {
      saveColumnOrder(tableId, columnOrder);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [tableId, columnOrder, defaultColumnOrder.length, columnsReady]);

  const orderedColumns = useMemo(() => {
    const columnMap = new Map(userColumns.map((col) => [col.key, col]));
    const leadingFixed = userColumns.filter((col) => isLeadingFixedColumnKey(col.key));
    const trailingFixed = userColumns.filter((col) => isTrailingFixedColumnKey(col.key));
    const ordered = columnOrder
      .map((key) => columnMap.get(key))
      .filter((col): col is Column<T> => Boolean(col));

    for (const col of userColumns) {
      if (isFixedColumnKey(col.key)) continue;
      if (!columnOrder.includes(col.key)) ordered.push(col);
    }

    const start = showSerialNumber ? [serialColumn, ...leadingFixed] : leadingFixed;
    return [...start, ...ordered, ...trailingFixed];
  }, [userColumns, columnOrder, serialColumn, showSerialNumber]);

  const visibleColumns = useMemo(() => {
    if (!columnsReady) return orderedColumns;
    return orderedColumns.filter(
      (col) => !isColumnHideable(col) || !hiddenKeys.has(col.key)
    );
  }, [orderedColumns, hiddenKeys, columnsReady]);

  const orderedMenuColumns = useMemo(() => {
    const columnMap = new Map(reorderableColumns.map((col) => [col.key, col]));
    return columnOrder
      .map((key) => columnMap.get(key))
      .filter((col): col is Column<T> => Boolean(col));
  }, [reorderableColumns, columnOrder]);

  const toggleColumnVisibility = (key: string, visible: boolean) => {
    setHiddenKeys((current) => {
      const next = new Set(current);
      if (visible) {
        next.delete(key);
      } else {
        const visibleHideableCount = hideableKeys.filter((colKey) => !next.has(colKey)).length;
        if (visibleHideableCount <= 1) return current;
        next.add(key);
      }
      return next;
    });
  };

  const showAllColumns = () => setHiddenKeys(new Set());

  const moveColumn = (key: string, direction: "left" | "right") => {
    setColumnOrder((current) => {
      const index = current.indexOf(key);
      if (index === -1) return current;

      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const resetColumnOrder = () => setColumnOrder(defaultColumnOrder);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("q");
    if (query) setSearch(query);
  }, []);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (!debouncedSearch) return rows;
    if (searchFilter) {
      return rows.filter((row) => searchFilter(row, debouncedSearch));
    }
    if (!searchKey) return rows;
    const q = debouncedSearch.toLowerCase();
    return rows.filter((row) =>
      String((row as Record<string, unknown>)[searchKey as string] ?? "")
        .toLowerCase()
        .includes(q)
    );
  }, [data, debouncedSearch, searchKey, searchFilter]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = userColumns.find((col) => col.key === sort.key);
    if (!column || !isColumnSortable(column)) return filtered;

    return [...filtered].sort((rowA, rowB) => {
      const comparison = compareSortValues(
        getSortValue(rowA, column),
        getSortValue(rowB, column)
      );
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [filtered, sort, userColumns]);

  const totalPages = pagination
    ? Math.max(1, Math.ceil(sorted.length / pageSize))
    : 1;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageStart = pagination ? (page - 1) * pageSize : 0;
  const paginatedRows = pagination
    ? sorted.slice(pageStart, pageStart + pageSize)
    : sorted;

  const pageEnd = pagination
    ? Math.min(pageStart + paginatedRows.length, sorted.length)
    : sorted.length;

  const hasActiveFilters = filtersActive || Boolean(search);
  const styles = densityStyles[density];
  const hasColumnToggle = reorderableColumns.length > 0;
  const hasToolbar = Boolean(
    filterContent || searchKey || searchFilter || hasColumnToggle || pagination
  );

  const handlePageSizeChange = (nextSize: string) => {
    const size = Number.parseInt(nextSize, 10);
    if (!PAGE_SIZE_OPTIONS.includes(size as (typeof PAGE_SIZE_OPTIONS)[number])) return;
    setPageSize(size);
    setPage(1);
    savePageSize(tableId, size);
  };

  const handleClearFilters = () => {
    setSearch("");
    onClearFilters?.();
  };

  const handleSort = (col: Column<T>) => {
    if (!isColumnSortable(col)) return;
    setSort((current) => {
      if (current?.key === col.key) {
        return {
          key: col.key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key: col.key, direction: "asc" };
    });
  };

  const getCellClass = (col: Column<T>, section: "head" | "body", muted = false) => {
    const align = col.align ? alignClass[col.align] : alignClass.left;
    const hideClass = col.hideBelow ? hideBelowClass[col.hideBelow] : "";
    const sticky = col.sticky
      ? cn(
          "md:sticky md:right-0 md:z-10 md:shadow-[-10px_0_16px_-12px_hsl(var(--background)/0.9)]",
          muted
            ? "md:bg-muted/50 group-hover:md:bg-muted/50"
            : "md:bg-card group-hover:md:bg-muted/40"
        )
      : "";

    if (section === "head") {
      return cn(
        styles.head,
        align,
        hideClass,
        STICKY_HEAD_CLASS,
        "whitespace-nowrap text-[13px] font-bold uppercase tracking-wide text-foreground/85",
        col.sticky &&
          "sticky top-0 md:right-0 md:z-30 md:shadow-[-10px_0_16px_-12px_hsl(var(--background)/0.9)]",
        col.headerClassName
      );
    }

    return cn(styles.cell, align, hideClass, styles.row, sticky, col.className);
  };

  const renderSortIcon = (col: Column<T>) => {
    if (!isColumnSortable(col)) return null;
    if (sort?.key !== col.key) {
      return <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />;
    }
    return sort.direction === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 shrink-0 text-primary" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 shrink-0 text-primary" />
    );
  };

  const handleRowKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTableCellElement>, rowIndex: number) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const nextIndex = event.key === "ArrowDown" ? rowIndex + 1 : rowIndex - 1;
      const nextRow = rowRefs.current[nextIndex];
      const nextFocus =
        nextRow?.querySelector<HTMLElement>('td[data-row-focus="true"]') ?? nextRow;
      nextFocus?.focus({ preventScroll: true });
    },
    []
  );

  return (
    <Card className="border shadow-sm">
      {hasToolbar && (
        <div
          className={cn(
            "flex flex-col gap-3 px-3 py-3 sm:px-4 sm:py-3.5 lg:flex-row lg:items-center lg:justify-between",
            STICKY_TOOLBAR_CLASS
          )}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            {filterContent}
            {showResultCount && (
              <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                {isLoading
                  ? "Loading…"
                  : `${sorted.length} of ${(data ?? []).length} records`}
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {hasColumnToggle && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-10 shrink-0">
                    <Columns3 className="mr-1.5 h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Columns</DropdownMenuLabel>
                  <p className="px-2 pb-1 text-xs text-muted-foreground">
                    Toggle visibility and reorder with arrows
                  </p>
                  <DropdownMenuSeparator />
                  {orderedMenuColumns.map((col, index) => {
                    const hideable = isColumnHideable(col);
                    const canMoveLeft = index > 0;
                    const canMoveRight = index < orderedMenuColumns.length - 1;
                    const isVisible = !hiddenKeys.has(col.key);

                    return (
                      <div
                        key={col.key}
                        className="flex items-center gap-0.5 rounded-sm px-1 py-0.5"
                        onPointerDown={(event) => event.preventDefault()}
                      >
                        {hideable ? (
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                            onClick={() => toggleColumnVisibility(col.key, !isVisible)}
                          >
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                                isVisible && "bg-primary text-primary-foreground"
                              )}
                            >
                              {isVisible && (
                                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </span>
                            <span className="truncate">{col.header}</span>
                          </button>
                        ) : (
                          <span className="min-w-0 flex-1 truncate px-2 py-1.5 text-sm">
                            {col.header}
                          </span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          disabled={!canMoveLeft}
                          aria-label={`Move ${col.header} left`}
                          onClick={() => moveColumn(col.key, "left")}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          disabled={!canMoveRight}
                          aria-label={`Move ${col.header} right`}
                          onClick={() => moveColumn(col.key, "right")}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  {(hiddenKeys.size > 0 ||
                    columnOrder.join("|") !== defaultColumnOrder.join("|")) && (
                    <>
                      <DropdownMenuSeparator />
                      {hiddenKeys.size > 0 && (
                        <DropdownMenuItem onSelect={showAllColumns}>
                          Show all columns
                        </DropdownMenuItem>
                      )}
                      {columnOrder.join("|") !== defaultColumnOrder.join("|") && (
                        <DropdownMenuItem onSelect={resetColumnOrder}>
                          Reset column order
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {(searchKey || searchFilter) && (
              <div className="relative w-full min-w-0 sm:min-w-[220px] sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="h-10 pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
            {onClearFilters && hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 shrink-0"
                onClick={handleClearFilters}
              >
                <X className="mr-1.5 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
      <CardContent className="p-0">
        <p className="border-b bg-muted/15 px-3 py-1.5 text-[11px] text-muted-foreground md:hidden">
          Swipe horizontally to see more columns
        </p>
        <div className="relative max-h-[min(70vh,calc(100dvh-13rem))] overflow-auto">
          <Table className={cn("min-w-full", tableClassName)}>
          <TableHeader className="[&_tr]:border-0">
            <TableRow className="border-0 hover:bg-transparent">
              {visibleColumns.map((col) => {
                const sortable = isColumnSortable(col);
                const isActive = sort?.key === col.key;

                return (
                  <TableHead
                    key={col.key}
                    className={getCellClass(col, "head")}
                    aria-sort={
                      isActive
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : sortable
                          ? "none"
                          : undefined
                    }
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col)}
                        aria-label={`Sort by ${col.header}`}
                        className={cn(
                          "inline-flex w-full items-center gap-1.5 transition-colors hover:text-foreground",
                          col.align === "center" && "justify-center",
                          col.align === "right" && "justify-end",
                          (!col.align || col.align === "left") && "justify-start",
                          isActive && "text-foreground"
                        )}
                      >
                        <span>{col.header}</span>
                        {renderSortIcon(col)}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="px-4 py-16 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/70" aria-hidden />
                    <p className="text-sm">{loadingMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row, i) => {
                const muted = isRowMuted?.(row) ?? false;
                const serialNumber = pageStart + i + 1;
                return (
                <TableRow
                  key={((row as { id?: string }).id) ?? pageStart + i}
                  ref={(element) => {
                    rowRefs.current[i] = element;
                  }}
                  className={cn(
                    "group border-b border-border/50 transition-colors",
                    muted
                      ? "bg-muted/50 text-muted-foreground opacity-70 hover:bg-muted/50"
                      : "hover:bg-muted/20"
                  )}
                >
                  {visibleColumns.map((col, colIndex) => (
                    <TableCell
                      key={col.key}
                      tabIndex={colIndex === 0 ? 0 : undefined}
                      data-row-focus={colIndex === 0 ? "true" : undefined}
                      onKeyDown={
                        colIndex === 0
                          ? (event) => handleRowKeyDown(event, i)
                          : undefined
                      }
                      className={cn(
                        getCellClass(col, "body", muted),
                        colIndex === 0 &&
                          "outline-none focus-visible:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      )}
                    >
                      {col.key === SERIAL_COLUMN_KEY
                        ? serialNumber
                        : col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key] ?? "-")}
                    </TableCell>
                  ))}
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </CardContent>
      {pagination && sorted.length > 0 && (
        <div className="flex flex-col gap-3 border-t bg-muted/20 px-3 py-3 sm:px-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {sorted.length === 0 ? 0 : pageStart + 1}–{pageEnd}
            </span>{" "}
            of <span className="font-medium text-foreground">{sorted.length}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows per page</span>
              <SearchableSelect
                value={String(pageSize)}
                onValueChange={(value) => handlePageSizeChange(value)}
                options={PAGE_SIZE_OPTIONS.map((size) => ({
                  value: String(size),
                  label: String(size),
                }))}
                placeholder={String(defaultPageSize)}
                searchPlaceholder="Search…"
                className="h-9 w-[72px] px-2"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={page <= 1}
                aria-label="Previous page"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[4.5rem] text-center text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={page >= totalPages}
                aria-label="Next page"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
