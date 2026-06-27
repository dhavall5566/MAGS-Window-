import type { DashboardStats } from "@/types";

const EMPTY_STATS: DashboardStats = {
  totalProfiles: 0,
  availableStock: 0,
  lowStockProfiles: 0,
  totalConsumption: 0,
  pendingCoating: 0,
  completedCoating: 0,
  scrapQuantity: 0,
};

function readNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Normalize dashboard API payload (flat or nested stats). */
export function parseDashboardResponse(data: Record<string, unknown> | null | undefined): {
  stats: DashboardStats;
  charts: Record<string, unknown[]>;
  recentTransactions: unknown[];
} {
  const raw = data ?? {};
  const nested = (raw.stats ?? {}) as Partial<DashboardStats>;

  const stats: DashboardStats = {
    totalProfiles: readNumber(raw.totalProfiles ?? nested.totalProfiles),
    availableStock: readNumber(raw.availableStock ?? nested.availableStock),
    lowStockProfiles: readNumber(raw.lowStockProfiles ?? nested.lowStockProfiles),
    totalConsumption: readNumber(raw.totalConsumption ?? nested.totalConsumption),
    pendingCoating: readNumber(raw.pendingCoating ?? nested.pendingCoating),
    completedCoating: readNumber(raw.completedCoating ?? nested.completedCoating),
    scrapQuantity: readNumber(raw.scrapQuantity ?? nested.scrapQuantity),
  };

  const charts = (raw.charts ?? {}) as Record<string, unknown[]>;

  return {
    stats,
    charts: {
      inventoryOverview: charts.inventoryOverview ?? [],
      monthlyStockMovement: charts.monthlyStockMovement ?? [],
      consumptionTrends: charts.consumptionTrends ?? [],
      colorDistribution: charts.colorDistribution ?? [],
    },
    recentTransactions: (raw.recentTransactions ?? []) as unknown[],
  };
}

export function getEmptyDashboardStats(): DashboardStats {
  return { ...EMPTY_STATS };
}
