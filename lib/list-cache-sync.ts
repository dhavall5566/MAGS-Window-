import { setJsonCacheEntry } from "@/lib/fetch-json";
import { normalizeStockInwardRecord } from "@/lib/stock-inward-calculations";
import { useAppStore } from "@/lib/store";
import type { Challan, StockInward } from "@/types";

export function syncListCache<K extends string>(
  url: string,
  listKey: K,
  items: unknown[]
): void {
  setJsonCacheEntry(url, { [listKey]: items } as Record<K, unknown[]>);
}

export function syncStockInwardList(inward: StockInward[]): void {
  const normalized = inward.map(normalizeStockInwardRecord);
  useAppStore.setState({ stockInward: normalized });
  setJsonCacheEntry("/api/stock", { inward: normalized });
}

/** Sync fetch cache from current store — avoids a full /api/stock refetch after mutations. */
export function syncStockInwardFromStore(): void {
  syncStockInwardList(useAppStore.getState().stockInward ?? []);
}

export function syncChallansList(challans: Challan[]): void {
  useAppStore.setState({ challans });
  setJsonCacheEntry("/api/challans", { challans });
}

/** Sync fetch cache from current store — avoids a full /api/challans refetch after mutations. */
export function syncChallansFromStore(): void {
  syncChallansList(useAppStore.getState().challans ?? []);
}
