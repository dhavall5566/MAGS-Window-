import type { DashboardStats, DashboardTransaction, Notification } from "@/types";
import {
  monthlyStockMovement,
  consumptionTrends,
  colorDistribution,
  inventoryByCategory,
} from "./reports";

/** Canonical dashboard KPIs — mock only, no database */
export const MOCK_DASHBOARD_STATS: DashboardStats = {
  totalProfiles: 274,
  availableStock: 15420,
  lowStockProfiles: 8,
  totalConsumption: 2200,
  pendingCoating: 15,
  completedCoating: 92,
  scrapQuantity: 180,
};

export const MOCK_RECENT_TRANSACTIONS: DashboardTransaction[] = [];

export const mockNotifications: Notification[] = [
  {
    id: "notif-001",
    title: "Low Stock Alert",
    message: "Curtain Wall Mullion 65mm is below minimum stock level (72/150)",
    type: "warning",
    read: false,
    createdAt: "2026-06-03T08:00:00Z",
  },
  {
    id: "notif-002",
    title: "Coating Batch Returned",
    message: "Return challan RET-2026-0008 received from ColorTech Coatings",
    type: "success",
    read: false,
    createdAt: "2026-06-03T07:30:00Z",
  },
  {
    id: "notif-003",
    title: "New Stock Inward",
    message: "INW-2026-0146 - 300 pcs Louvre Blade received",
    type: "info",
    read: true,
    createdAt: "2026-06-03T06:00:00Z",
  },
  {
    id: "notif-004",
    title: "Pending Coating Dispatch",
    message: "2 batches pending dispatch to powder coating vendors",
    type: "warning",
    read: true,
    createdAt: "2026-06-02T16:00:00Z",
  },
];

export const dashboardCharts = {
  inventoryOverview: inventoryByCategory ?? [],
  monthlyStockMovement: monthlyStockMovement ?? [],
  consumptionTrends: consumptionTrends ?? [],
  colorDistribution: colorDistribution ?? [],
};

export function getDashboardStats(): DashboardStats {
  return MOCK_DASHBOARD_STATS;
}
