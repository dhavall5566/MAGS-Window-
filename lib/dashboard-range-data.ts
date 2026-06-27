import type { DashboardStats } from "@/types";
import {
  type DashboardTimeframe,
  type DateRange,
  getDateRangeForTimeframe,
} from "@/lib/dashboard-timeframe";

const EMPTY_STATS: DashboardStats = {
  totalProfiles: 0,
  availableStock: 0,
  lowStockProfiles: 0,
  totalConsumption: 0,
  pendingCoating: 0,
  completedCoating: 0,
  scrapQuantity: 0,
};

/** @deprecated Dashboard is computed live from app data. Returns empty series only. */
export function buildDashboardPayloadForRange(
  _timeframe: DashboardTimeframe,
  _reference = new Date()
): {
  stats: DashboardStats;
  charts: {
    inventoryOverview: never[];
    monthlyStockMovement: never[];
    consumptionTrends: never[];
    colorDistribution: never[];
  };
} {
  return {
    stats: { ...EMPTY_STATS },
    charts: {
      inventoryOverview: [],
      monthlyStockMovement: [],
      consumptionTrends: [],
      colorDistribution: [],
    },
  };
}

export type { DateRange, DashboardTimeframe };

export { getDateRangeForTimeframe };
