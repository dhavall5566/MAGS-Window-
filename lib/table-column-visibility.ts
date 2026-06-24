const STORAGE_PREFIX = "mags-table-columns-hidden:";
const ORDER_STORAGE_PREFIX = "mags-table-columns-order:";
const PAGE_SIZE_PREFIX = "mags-table-page-size:";

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function isLeadingFixedColumnKey(key: string): boolean {
  return key === "srNo";
}

export function isTrailingFixedColumnKey(key: string): boolean {
  return key === "actions";
}

export function isFixedColumnKey(key: string): boolean {
  return isLeadingFixedColumnKey(key) || isTrailingFixedColumnKey(key);
}

export function loadPageSize(tableId: string): number {
  if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;

  try {
    const raw = localStorage.getItem(`${PAGE_SIZE_PREFIX}${tableId}`);
    if (!raw) return DEFAULT_PAGE_SIZE;

    const size = Number.parseInt(raw, 10);
    return PAGE_SIZE_OPTIONS.includes(size as (typeof PAGE_SIZE_OPTIONS)[number])
      ? size
      : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

export function savePageSize(tableId: string, size: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PAGE_SIZE_PREFIX}${tableId}`, String(size));
}

export function mergeColumnOrder(savedOrder: string[], defaultKeys: string[]): string[] {
  const merged = savedOrder.filter((key) => defaultKeys.includes(key));
  for (const key of defaultKeys) {
    if (!merged.includes(key)) merged.push(key);
  }
  return merged;
}

export function loadColumnOrder(tableId: string, defaultKeys: string[]): string[] {
  if (typeof window === "undefined" || defaultKeys.length === 0) {
    return defaultKeys;
  }

  try {
    const raw = localStorage.getItem(`${ORDER_STORAGE_PREFIX}${tableId}`);
    if (!raw) return defaultKeys;

    const saved = JSON.parse(raw) as string[];
    if (!Array.isArray(saved)) return defaultKeys;

    return mergeColumnOrder(saved, defaultKeys);
  } catch {
    return defaultKeys;
  }
}

export function saveColumnOrder(tableId: string, order: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${ORDER_STORAGE_PREFIX}${tableId}`, JSON.stringify(order));
}

export function loadHiddenColumnKeys(tableId: string, hideableKeys: string[]): Set<string> {
  if (typeof window === "undefined" || hideableKeys.length === 0) {
    return new Set();
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tableId}`);
    if (!raw) return new Set();

    const hidden = JSON.parse(raw) as string[];
    if (!Array.isArray(hidden)) return new Set();

    const valid = hidden.filter((key) => hideableKeys.includes(key));
    if (valid.length >= hideableKeys.length) return new Set();
    return new Set(valid);
  } catch {
    return new Set();
  }
}

export function saveHiddenColumnKeys(tableId: string, hiddenKeys: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    `${STORAGE_PREFIX}${tableId}`,
    JSON.stringify([...hiddenKeys])
  );
}
