import { getProfileStockKey } from "@/lib/challan-consumption";
import {
  calculateTotalProfiles,
  STOCK_INWARD_KG_PER_METER,
} from "@/lib/stock-inward-calculations";
import type { Consumption, StockInward, StockLedgerEntry } from "@/types";

export interface StockMasterRow {
  id: string;
  profileCode: string;
  profileName: string;
  stockKg: number;
  totalWeightKg: number;
  length: number;
  kgPerMeter: number;
  totalProfiles: number;
}

interface StockMasterBucket {
  profileCode: string;
  profileName: string;
  length: number;
  kgPerMeter: number;
  inwardKg: number;
}

interface StockMasterMovementTotals {
  weight: number;
}

function getInwardWeight(entry: StockInward): number {
  return entry.totalWeightKg ?? entry.weight ?? 0;
}

/** Normalize length (m) so identical inward lengths group into one stock master row. */
export function normalizeStockLength(length: number): number {
  if (!Number.isFinite(length) || length <= 0) return 0;
  return Math.round(length * 10000) / 10000;
}

export function getStockMasterRowKey(entry: {
  profileCode: string;
  profileName: string;
  length: number;
}): string {
  const profileKey = getProfileStockKey(entry);
  const length = normalizeStockLength(entry.length);
  return `${profileKey}::${length}`;
}

export function mergeStockInward(
  api: StockInward[],
  store: StockInward[],
  deletedIds: string[] = []
): StockInward[] {
  const deleted = new Set(deletedIds);
  const merged = api.filter((entry) => !deleted.has(entry.id));
  store.forEach((entry) => {
    if (deleted.has(entry.id)) return;
    const existing = merged.find((m) => m?.id === entry?.id);
    if (existing) {
      Object.assign(existing, entry);
    } else {
      merged.push(entry);
    }
  });
  return merged;
}

export function buildStockMasterRows(
  inward: StockInward[],
  consumption: Consumption[] = []
): StockMasterRow[] {
  const buckets = new Map<string, StockMasterBucket>();

  for (const entry of inward) {
    if (entry.status === "split") continue;

    const length = normalizeStockLength(entry.length ?? 0);
    if (!length) continue;

    const key = getStockMasterRowKey({ ...entry, length });
    const bucket = buckets.get(key) ?? {
      profileCode: entry.profileCode,
      profileName: entry.profileName,
      length,
      kgPerMeter: entry.kgPerMeter ?? STOCK_INWARD_KG_PER_METER,
      inwardKg: 0,
    };

    bucket.inwardKg += getInwardWeight(entry);
    bucket.kgPerMeter = entry.kgPerMeter ?? bucket.kgPerMeter;
    buckets.set(key, bucket);
  }

  const consumedByKey = new Map<string, StockMasterMovementTotals>();
  for (const entry of consumption) {
    const length = normalizeStockLength(entry.length ?? 0);
    if (!length) continue;

    const key = getStockMasterRowKey({ ...entry, length });
    const totals = consumedByKey.get(key) ?? { weight: 0 };
    totals.weight += entry.weight ?? 0;
    consumedByKey.set(key, totals);
  }

  return Array.from(buckets.entries())
    .map(([key, bucket]) => {
      const consumedKg = consumedByKey.get(key)?.weight ?? 0;
      const stockKg = Math.max(0, Math.round((bucket.inwardKg - consumedKg) * 100) / 100);
      const totalProfiles = calculateTotalProfiles(
        stockKg,
        bucket.length,
        bucket.kgPerMeter
      );

      return {
        id: key,
        profileCode: bucket.profileCode,
        profileName: bucket.profileName,
        stockKg,
        totalWeightKg: stockKg,
        length: bucket.length,
        kgPerMeter: bucket.kgPerMeter,
        totalProfiles,
      };
    })
    .filter((row) => row.stockKg > 0)
    .sort((a, b) => {
      const codeSort = a.profileCode.localeCompare(b.profileCode);
      if (codeSort !== 0) return codeSort;
      return a.length - b.length;
    });
}

function ledgerTypeForConsumption(
  entry: Consumption
): StockLedgerEntry["type"] {
  if (entry.challanType === "powder_coating") return "coating_sent";
  return "consumption";
}

export function buildStockLedgerRows(
  inward: StockInward[],
  consumption: Consumption[] = []
): StockLedgerEntry[] {
  const movements: StockLedgerEntry[] = [
    ...inward
      .filter((entry) => entry.status !== "split")
      .map((entry) => {
      const totalWeightKg = Math.round((entry.totalWeightKg ?? entry.weight ?? 0) * 100) / 100;
      const length = entry.length ?? 0;
      const kgPerMeter = entry.kgPerMeter ?? STOCK_INWARD_KG_PER_METER;
      const totalProfiles =
        entry.quantity ?? calculateTotalProfiles(totalWeightKg, length, kgPerMeter);

      return {
        id: `ledger-inward-${entry.id}`,
        date: entry.date,
        profileCode: entry.profileCode,
        profileName: entry.profileName,
        type: "inward" as const,
        reference: entry.inwardNo,
        quantityIn: Math.max(0, entry.quantity ?? 0),
        quantityOut: 0,
        balance: 0,
        weight: totalWeightKg,
        totalWeightKg,
        length,
        kgPerMeter,
        totalProfiles,
      };
    }),
    ...consumption.map((entry) => {
      const totalWeightKg = Math.round(Math.abs(entry.weight ?? 0) * 100) / 100;
      const length = entry.length ?? 0;
      const kgPerMeter = STOCK_INWARD_KG_PER_METER;
      const totalProfiles = Math.abs(
        entry.quantity ?? calculateTotalProfiles(totalWeightKg, length, kgPerMeter)
      );
      const quantity = entry.quantity ?? 0;
      const weight = totalWeightKg;
      const isStockIn = (entry.weight ?? 0) < 0 || quantity < 0;

      return {
        id: `ledger-consumption-${entry.id}`,
        date: entry.date,
        profileCode: entry.profileCode,
        profileName: entry.profileName,
        type: ledgerTypeForConsumption(entry),
        reference: entry.challanNumber ?? entry.consumptionNo,
        quantityIn: isStockIn ? Math.abs(quantity) : 0,
        quantityOut: isStockIn ? 0 : Math.abs(quantity),
        balance: 0,
        weight,
        totalWeightKg,
        length,
        kgPerMeter,
        totalProfiles,
      };
    }),
  ].sort((a, b) => {
    const dateSort = a.date.localeCompare(b.date);
    if (dateSort !== 0) return dateSort;
    return a.id.localeCompare(b.id);
  });

  const balances = new Map<string, number>();
  return movements.map((entry) => {
    const key = getProfileStockKey(entry);
    const signedWeight = entry.quantityIn > 0 ? entry.weight : -entry.weight;
    const nextBalance = Math.round(((balances.get(key) ?? 0) + signedWeight) * 100) / 100;
    balances.set(key, nextBalance);
    return { ...entry, balance: nextBalance };
  });
}
