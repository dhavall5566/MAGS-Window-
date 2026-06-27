import type { DashboardStats, DashboardTransaction, Notification } from "@/types";

/** Empty dashboard KPIs — computed live from app data. */
export const MOCK_DASHBOARD_STATS: DashboardStats = {
  totalProfiles: 0,
  availableStock: 0,
  lowStockProfiles: 0,
  totalConsumption: 0,
  pendingCoating: 0,
  completedCoating: 0,
  scrapQuantity: 0,
};

export const MOCK_RECENT_TRANSACTIONS: DashboardTransaction[] = [];

export const mockNotifications: Notification[] = [];

export const dashboardCharts = {
  inventoryOverview: [],
  monthlyStockMovement: [],
  consumptionTrends: [],
  colorDistribution: [],
};

export function getDashboardStats(): DashboardStats {
  return { ...MOCK_DASHBOARD_STATS };
}
