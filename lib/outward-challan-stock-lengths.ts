import { getProfileStockKey } from "@/lib/challan-consumption";
import { formatStockLength } from "@/lib/stock-inward-calculations";
import { buildStockMasterRows, normalizeStockLength } from "@/lib/stock-master";
import type { Consumption, StockInward } from "@/types";

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

  const stockKey = getProfileStockKey({
    profileCode,
    profileName: profileName ?? profileCode,
  });

  const lengths = buildStockMasterRows(inward, consumption)
    .filter((row) => getProfileStockKey(row) === stockKey && row.stockKg > 0)
    .map((row) => row.length);

  return [...new Set(lengths)].sort((a, b) => a - b);
}

export function formatSplitLengthOption(length: number): string {
  return `${formatStockLength(length)} m`;
}

export function resolveOutwardChallanItemLength(
  profileCode: string,
  profileName: string | undefined,
  inward: StockInward[],
  consumption: Consumption[],
  fallbackLength: number
): number {
  const splitLengths = getRemainingSplitStockLengths(
    profileCode,
    profileName,
    inward,
    consumption
  );
  if (splitLengths.length > 0) return splitLengths[0];
  return fallbackLength;
}

/** Split lengths available for one outward line (excludes other lines on the same profile). */
export function getOutwardChallanSplitLengthOptions(
  profileCode: string,
  profileName: string | undefined,
  inward: StockInward[],
  consumption: Consumption[],
  currentLength: number,
  reservedLengths: number[] = []
): number[] {
  const available = getRemainingSplitStockLengths(
    profileCode,
    profileName,
    inward,
    consumption
  );
  if (available.length === 0) return [];

  const reserved = new Set(
    reservedLengths
      .map((length) => normalizeStockLength(length))
      .filter((length) => length > 0)
  );
  const current = normalizeStockLength(currentLength);

  let options = available.filter((length) => !reserved.has(length));

  if (current > 0 && !options.includes(current)) {
    options = [...options, current].sort((a, b) => a - b);
  }

  return options;
}
