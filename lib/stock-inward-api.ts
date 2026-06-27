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

function invalidateStockInwardCaches(): void {
  invalidateJsonCache(STOCK_LIST_URL);
  invalidateJsonCache(LIST_URL);
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
    invalidateStockInwardCaches();
    if (!res.ok) return null;
    const data = (await res.json()) as { stockInward?: StockInward };
    return data.stockInward ? normalizeStockInwardRecord(data.stockInward) : normalizeStockInwardRecord(entry);
  } catch {
    return null;
  }
}

async function createStockInwardEntriesSequential(
  entries: StockInward[]
): Promise<StockInward[] | null> {
  const saved: StockInward[] = [];

  for (const entry of entries) {
    const row = await createStockInwardApi(entry);
    if (!row) {
      for (const created of saved) {
        await deleteStockInwardApi(created.id);
      }
      return null;
    }
    saved.push(row);
  }

  return saved;
}

export async function createStockInwardBatchApi(
  entries: StockInward[]
): Promise<StockInward[] | null> {
  const normalized = entries.map(normalizeStockInwardRecord);

  try {
    const res = await fetch(`${LIST_URL}/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: normalized }),
    });
    invalidateStockInwardCaches();
    if (res.ok) {
      const data = (await res.json()) as { stockInward?: StockInward[] };
      const rows = (data.stockInward ?? []).map(normalizeStockInwardRecord);
      if (rows.length === normalized.length) {
        return rows;
      }
    }
  } catch {
    // Fall back to sequential saves below.
  }

  return createStockInwardEntriesSequential(normalized);
}

/** Save one or more stock inward entries atomically when possible. */
export async function saveStockInwardEntriesApi(
  entries: StockInward[]
): Promise<StockInward[] | null> {
  const normalized = entries.map(normalizeStockInwardRecord);
  if (normalized.length === 0) return [];
  if (normalized.length === 1) {
    const saved = await createStockInwardApi(normalized[0]);
    return saved ? [saved] : null;
  }
  return createStockInwardBatchApi(normalized);
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
