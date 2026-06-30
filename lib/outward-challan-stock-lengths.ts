import { getProfileStockKey } from "@/lib/challan-consumption";
import { formatStockLength } from "@/lib/stock-inward-calculations";
import {
  buildStockMasterRows,
  getStockMasterRowKey,
  normalizeStockLength,
} from "@/lib/stock-master";
import type { Consumption, StockInward } from "@/types";

export const OUTWARD_STOCK_UNAVAILABLE_MESSAGE = "This item is not in stock.";

export interface OutwardChallanLineItem {
  profileCode: string;
  profileName?: string;
  length: number;
  qty: number;
}

export function getOutwardStockReservationKey(
  profileCode: string,
  profileName: string | undefined,
  length: number
): string {
  return getStockMasterRowKey({
    profileCode,
    profileName: profileName ?? profileCode,
    length: normalizeStockLength(length),
  });
}

/** Available profile count (NOS) at profile + length after inward and consumption. */
export function getAvailableOutwardStockQty(
  profileCode: string,
  profileName: string | undefined,
  length: number,
  inward: StockInward[],
  consumption: Consumption[]
): number {
  const normalizedLength = normalizeStockLength(length);
  if (!profileCode?.trim() || !normalizedLength) return 0;

  const key = getOutwardStockReservationKey(profileCode, profileName, normalizedLength);
  const row = buildStockMasterRows(inward, consumption).find((entry) => entry.id === key);
  return row?.totalProfiles ?? 0;
}

export function getReservedOutwardQtyForKey(
  items: OutwardChallanLineItem[],
  key: string
): number {
  return items.reduce((total, item) => {
    const itemKey = getOutwardStockReservationKey(
      item.profileCode,
      item.profileName,
      Number(item.length) || 0
    );
    if (itemKey !== key) return total;
    return total + Math.max(0, Number(item.qty) || 0);
  }, 0);
}

export function getOutwardLineStockIssue(
  item: OutwardChallanLineItem,
  items: OutwardChallanLineItem[],
  inward: StockInward[],
  consumption: Consumption[]
): string | null {
  if (!item.profileCode?.trim()) return null;

  const length = Number(item.length) || 0;
  if (!length) return null;

  const key = getOutwardStockReservationKey(item.profileCode, item.profileName, length);
  const available = getAvailableOutwardStockQty(
    item.profileCode,
    item.profileName,
    length,
    inward,
    consumption
  );

  if (available <= 0) {
    return OUTWARD_STOCK_UNAVAILABLE_MESSAGE;
  }

  const qty = Math.max(0, Number(item.qty) || 0);
  if (!qty) return null;

  const totalRequested = getReservedOutwardQtyForKey(items, key);
  if (totalRequested > available) {
    return OUTWARD_STOCK_UNAVAILABLE_MESSAGE;
  }

  return null;
}

export function findFirstOutwardStockIssue(
  items: OutwardChallanLineItem[],
  inward: StockInward[],
  consumption: Consumption[]
): { index: number; message: string; profileCode: string } | null {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const message = getOutwardLineStockIssue(item, items, inward, consumption);
    if (message) {
      return { index, message, profileCode: item.profileCode };
    }
  }
  return null;
}

export function hasOutwardStockIssues(
  items: OutwardChallanLineItem[],
  inward: StockInward[],
  consumption: Consumption[]
): boolean {
  return findFirstOutwardStockIssue(items, inward, consumption) !== null;
}

function matchesProfileStockKey(
  entry: Pick<StockInward, "profileCode" | "profileName">,
  profileCode: string,
  profileName?: string
): boolean {
  const entryKey = getProfileStockKey(entry);
  const targetKey = getProfileStockKey({
    profileCode,
    profileName: profileName ?? profileCode,
  });
  return Boolean(entryKey && entryKey === targetKey);
}

/** True when this profile has active stock-inward rows created from a length split. */
export function isSplitProfileStock(
  profileCode: string,
  profileName: string | undefined,
  inward: StockInward[]
): boolean {
  return inward.some(
    (entry) =>
      entry.status !== "split" &&
      Boolean(entry.splitFromId) &&
      matchesProfileStockKey(entry, profileCode, profileName)
  );
}

/** All in-stock lengths (m) for a profile from stock inward after consumption. */
export function getAvailableOutwardStockLengths(
  profileCode: string,
  profileName: string | undefined,
  inward: StockInward[],
  consumption: Consumption[]
): number[] {
  if (!profileCode?.trim()) return [];

  const stockKey = getProfileStockKey({
    profileCode,
    profileName: profileName ?? profileCode,
  });

  const lengths = buildStockMasterRows(inward, consumption)
    .filter((row) => getProfileStockKey(row) === stockKey && row.stockKg > 0)
    .map((row) => normalizeStockLength(row.length));

  return [...new Set(lengths.filter((length) => length > 0))].sort((a, b) => a - b);
}

/** Remaining split piece lengths (m) with stock on hand for outward challan selection. */
export function getRemainingSplitStockLengths(
  profileCode: string,
  profileName: string | undefined,
  inward: StockInward[],
  consumption: Consumption[]
): number[] {
  if (!isSplitProfileStock(profileCode, profileName, inward)) {
    return [];
  }
  return getAvailableOutwardStockLengths(profileCode, profileName, inward, consumption);
}

export function formatOutwardLengthOption(length: number): string {
  return `${formatStockLength(length)} m`;
}

/** @deprecated Use formatOutwardLengthOption */
export const formatSplitLengthOption = formatOutwardLengthOption;

export function resolveOutwardChallanItemLength(
  profileCode: string,
  profileName: string | undefined,
  inward: StockInward[],
  consumption: Consumption[],
  fallbackLength: number
): number {
  const available = getAvailableOutwardStockLengths(
    profileCode,
    profileName,
    inward,
    consumption
  );
  if (available.length === 1) return available[0];
  if (available.length === 0) return normalizeStockLength(fallbackLength);
  return 0;
}

/** In-stock lengths available for one outward line item. */
export function getOutwardChallanLengthOptions(
  profileCode: string,
  profileName: string | undefined,
  inward: StockInward[],
  consumption: Consumption[],
  currentLength: number
): number[] {
  const available = getAvailableOutwardStockLengths(
    profileCode,
    profileName,
    inward,
    consumption
  );
  const current = normalizeStockLength(currentLength);

  if (current > 0 && !available.includes(current)) {
    return [...available, current].sort((a, b) => a - b);
  }

  return available;
}

/** @deprecated Use getOutwardChallanLengthOptions */
export function getOutwardChallanSplitLengthOptions(
  profileCode: string,
  profileName: string | undefined,
  inward: StockInward[],
  consumption: Consumption[],
  currentLength: number,
  _reservedLengths: number[] = []
): number[] {
  return getOutwardChallanLengthOptions(
    profileCode,
    profileName,
    inward,
    consumption,
    currentLength
  );
}
