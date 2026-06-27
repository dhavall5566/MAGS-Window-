"use client";

import dynamic from "next/dynamic";
import {
  Boxes,
  Package,
  AlertTriangle,
  SprayCan,
  CheckCircle,
  Factory,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { DEFAULT_DASHBOARD_TIMEFRAME } from "@/lib/dashboard-timeframe";
import { useDashboardLiveStats } from "@/hooks/use-dashboard-live-data";
import { normalizeStockInwardRecord } from "@/lib/stock-inward-calculations";
import { formatNumber } from "@/lib/utils";
import { useCachedOrStoreList } from "@/hooks/use-seeded-list-state";
import { useAppStore } from "@/lib/store";

const DashboardCharts = dynamic(
  () =>
    import("@/components/dashboard/dashboard-charts").then((mod) => mod.DashboardCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[360px] rounded-xl border bg-card animate-pulse" />
        ))}
      </div>
    ),
  }
);

const selectStoreProfiles = (state: ReturnType<typeof useAppStore.getState>) =>
  state.profiles ?? [];
const selectStoreInward = (state: ReturnType<typeof useAppStore.getState>) =>
  state.stockInward ?? [];
const selectStoreChallans = (state: ReturnType<typeof useAppStore.getState>) =>
  state.challans ?? [];
const selectStorePowderCoating = (state: ReturnType<typeof useAppStore.getState>) =>
  state.powderCoating ?? [];

export default function DashboardPage() {
  const [apiProfiles] = useCachedOrStoreList(
    "/api/profiles",
    "profiles",
    selectStoreProfiles
  );
  const [apiInward] = useCachedOrStoreList(
    "/api/stock",
    "inward",
    selectStoreInward,
    normalizeStockInwardRecord
  );
  const [apiChallans] = useCachedOrStoreList(
    "/api/challans",
    "challans",
    selectStoreChallans
  );
  const [apiPowderCoating] = useCachedOrStoreList(
    "/api/powder-coating",
    "powderCoating",
    selectStorePowderCoating
  );

  const stats = useDashboardLiveStats(
    DEFAULT_DASHBOARD_TIMEFRAME,
    apiProfiles,
    apiInward,
    apiChallans,
    apiPowderCoating
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of aluminium profile inventory and operations"
      />

      <div className="mb-6 grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          title="NOS"
          value={formatNumber(stats.totalProfiles ?? 0)}
          icon={Boxes}
          href="/profiles"
        />
        <StatCard
          title="Available Stock"
          value={formatNumber(stats.availableStock ?? 0)}
          subtitle="Total pieces in inventory"
          icon={Package}
          variant="success"
          href="/stock-master"
        />
        <StatCard
          title="Low Stock"
          value={formatNumber(stats.lowStockProfiles ?? 0)}
          subtitle="Below minimum level"
          icon={AlertTriangle}
          variant="warning"
          href="/stock-master"
        />
        <StatCard
          title="Consumption"
          value={formatNumber(stats.totalConsumption ?? 0)}
          subtitle="Units consumed"
          icon={Factory}
          href="/consumption"
        />
        <StatCard
          title="Pending Coating"
          value={formatNumber(stats.pendingCoating ?? 0)}
          icon={SprayCan}
          variant="warning"
          href="/powder-coating"
        />
        <StatCard
          title="Completed Coating"
          value={formatNumber(stats.completedCoating ?? 0)}
          icon={CheckCircle}
          variant="success"
          href="/powder-coating"
        />
      </div>

      <DashboardCharts
        apiProfiles={apiProfiles}
        apiInward={apiInward}
        apiChallans={apiChallans}
        apiPowderCoating={apiPowderCoating}
      />
    </div>
  );
}
