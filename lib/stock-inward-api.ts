import { mergeStockInward } from "@/lib/stock-master";
import { fetchJson, invalidateJsonCache } from "@/lib/fetch-json";
import { normalizeStockInwardRecord } from "@/lib/stock-inward-calculations";
import type { StockInward } from "@/types";

const LIST_URL = "/api/stock-inward";
const STOCK_LIST_URL = "/api/stock";

export async function fetchStockInwardEntries(
  storeEntries: StockInward[] = [],
  deletedIds: string[] = []
): Promise<StockInward[]> {
  const data = await fetchJson<{ inward?: StockInward[] }>(
    STOCK_LIST_URL,
    { inward: [] },
    { force: true }
  );
  const apiRows = (data.inward ?? []).map(normalizeStockInwardRecord);
  return mergeStockInward(apiRows, storeEntries.map(normalizeStockInwardRecord), deletedIds);
}

export async function createStockInwardApi(
  entry: StockInward
): Promise<StockInward | null> {
  try {
    const res = await fetch(LIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizeStockInwardRecord(entry)),
    });
    invalidateJsonCache(STOCK_LIST_URL);
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { stockInward?: StockInward };
    return data.stockInward ? normalizeStockInwardRecord(data.stockInward) : normalizeStockInwardRecord(entry);
  } catch {
    return null;
  }
}

export async function updateStockInwardApi(
  entry: StockInward
): Promise<StockInward | null> {
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(entry.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizeStockInwardRecord(entry)),
    });
    invalidateJsonCache(STOCK_LIST_URL);
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { stockInward?: StockInward };
    return data.stockInward ? normalizeStockInwardRecord(data.stockInward) : normalizeStockInwardRecord(entry);
  } catch {
    return null;
  }
}

export async function deleteStockInwardApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    invalidateJsonCache(STOCK_LIST_URL);
    invalidateJsonCache(LIST_URL);
    return res.ok;
  } catch {
    return false;
  }
}

export interface StockInwardSplitApiResult {
  updatedParent: StockInward;
  children: StockInward[];
}

export async function splitStockInwardApi(
  parentId: string,
  pieces: { lengthInMeter: number }[]
): Promise<StockInwardSplitApiResult | null> {
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(parentId)}/split`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pieces: pieces.map((piece) => ({
          length: piece.lengthInMeter,
        })),
      }),
    });
    invalidateJsonCache(STOCK_LIST_URL);
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      updatedParent?: StockInward;
      children?: StockInward[];
    };
    if (!data.updatedParent || !data.children?.length) return null;
    return {
      updatedParent: normalizeStockInwardRecord(data.updatedParent),
      children: data.children.map(normalizeStockInwardRecord),
    };
  } catch {
    return null;
  }
}
