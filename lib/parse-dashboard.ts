import type { DashboardStats } from "@/types";

const DEFAULT_STATS: DashboardStats = {
  totalProfiles: 125,
  availableStock: 15420,
  lowStockProfiles: 8,
  totalConsumption: 2200,
  pendingCoating: 15,
  completedCoating: 92,
  scrapQuantity: 180,
};

/** Normalize dashboard API payload (flat or nested stats) */
export function parseDashboardResponse(data: Record<string, unknown> | null | undefined): {
  stats: DashboardStats;
  charts: Record<string, unknown[]>;
  recentTransactions: unknown[];
} {
  const raw = data ?? {};
  const nested = (raw.stats ?? {}) as Partial<DashboardStats>;

  const stats: DashboardStats = {
    totalProfiles:
      Number(raw.totalProfiles ?? nested.totalProfiles) || DEFAULT_STATS.totalProfiles,
    availableStock:
      Number(raw.availableStock ?? nested.availableStock) || DEFAULT_STATS.availableStock,
    lowStockProfiles:
      Number(raw.lowStockProfiles ?? nested.lowStockProfiles) ||
      DEFAULT_STATS.lowStockProfiles,
    totalConsumption:
      Number(raw.totalConsumption ?? nested.totalConsumption) ||
      DEFAULT_STATS.totalConsumption,
    pendingCoating:
      Number(raw.pendingCoating ?? nested.pendingCoating) || DEFAULT_STATS.pendingCoating,
    completedCoating:
      Number(raw.completedCoating ?? nested.completedCoating) ||
      DEFAULT_STATS.completedCoating,
    scrapQuantity:
      Number(raw.scrapQuantity ?? nested.scrapQuantity) || DEFAULT_STATS.scrapQuantity,
  };

  return {
    stats,
    charts: (raw.charts ?? {}) as Record<string, unknown[]>,
    recentTransactions: (raw.recentTransactions ?? []) as unknown[],
  };
}
