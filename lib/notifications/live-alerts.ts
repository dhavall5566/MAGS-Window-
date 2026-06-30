import { buildStockConsumptionFromChallans } from "@/lib/challan-consumption";
import { DEFAULT_APP_SETTINGS } from "@/lib/app-settings";
import { buildStockMasterRows, mergeStockInward } from "@/lib/stock-master";
import { normalizeStockInwardRecord } from "@/lib/stock-inward-calculations";
import type { Challan, Notification, StockInward } from "@/types";

const MAX_LOW_STOCK_ALERTS = 4;
const MAX_OUT_OF_STOCK_ALERTS = 4;

export function buildLiveAlertKey(category: string, entityId: string): string {
  return `live:${category}:${entityId}`;
}

export interface BuildLiveAlertsInput {
  apiInward: StockInward[];
  storeInward: StockInward[];
  deletedStockInwardIds: string[];
  apiChallans: Challan[];
  storeChallans: Challan[];
  lowStockThresholdKg?: number;
  dismissedKeys?: string[];
}

export function buildLiveAlerts({
  apiInward,
  storeInward,
  deletedStockInwardIds,
  apiChallans,
  storeChallans,
  lowStockThresholdKg = DEFAULT_APP_SETTINGS.lowStockThresholdKg,
  dismissedKeys = [],
}: BuildLiveAlertsInput): Notification[] {
  const dismissed = new Set(dismissedKeys);
  const mergedInward = mergeStockInward(
    apiInward.map(normalizeStockInwardRecord),
    storeInward.map(normalizeStockInwardRecord),
    deletedStockInwardIds
  ).filter((entry) => entry.status !== "split");

  const consumption = buildStockConsumptionFromChallans(apiChallans, storeChallans);
  const allRows = buildStockMasterRows(mergedInward, consumption, {
    includeZeroStock: true,
  });

  const lowStockRows = allRows
    .filter((row) => row.stockKg > 0 && row.stockKg <= lowStockThresholdKg)
    .sort((a, b) => a.stockKg - b.stockKg);

  const outOfStockRows = allRows
    .filter((row) => row.stockKg === 0)
    .sort((a, b) => a.profileCode.localeCompare(b.profileCode));

  const alerts: Notification[] = [];
  const now = new Date().toISOString();

  for (const row of lowStockRows.slice(0, MAX_LOW_STOCK_ALERTS)) {
    const key = buildLiveAlertKey("stock_low", row.id);
    if (dismissed.has(key)) continue;

    alerts.push({
      id: key,
      title: "Low stock",
      message: `${row.profileCode} · ${row.length} m — ${row.stockKg} kg left (threshold ${lowStockThresholdKg} kg)`,
      type: "warning",
      source: "live",
      category: "stock_low",
      href: `/stock-master?q=${encodeURIComponent(row.profileCode)}`,
      entityId: row.id,
      read: false,
      createdAt: now,
    });
  }

  if (lowStockRows.length > MAX_LOW_STOCK_ALERTS) {
    const key = buildLiveAlertKey("stock_low", "summary");
    if (!dismissed.has(key)) {
      alerts.push({
        id: key,
        title: "Low stock",
        message: `${lowStockRows.length} profile length(s) are below ${lowStockThresholdKg} kg`,
        type: "warning",
        source: "live",
        category: "stock_low",
        href: "/stock-master",
        entityId: "summary",
        read: false,
        createdAt: now,
      });
    }
  }

  for (const row of outOfStockRows.slice(0, MAX_OUT_OF_STOCK_ALERTS)) {
    const key = buildLiveAlertKey("stock_out", row.id);
    if (dismissed.has(key)) continue;

    alerts.push({
      id: key,
      title: "Out of stock",
      message: `${row.profileCode} · ${row.length} m — no stock available`,
      type: "warning",
      source: "live",
      category: "stock_out",
      href: `/stock-master?q=${encodeURIComponent(row.profileCode)}`,
      entityId: row.id,
      read: false,
      createdAt: now,
    });
  }

  if (outOfStockRows.length > MAX_OUT_OF_STOCK_ALERTS) {
    const key = buildLiveAlertKey("stock_out", "summary");
    if (!dismissed.has(key)) {
      alerts.push({
        id: key,
        title: "Out of stock",
        message: `${outOfStockRows.length} profile length(s) have zero stock`,
        type: "warning",
        source: "live",
        category: "stock_out",
        href: "/stock-master",
        entityId: "summary",
        read: false,
        createdAt: now,
      });
    }
  }

  return alerts;
}
