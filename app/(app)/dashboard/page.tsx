"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Boxes,
  Package,
  AlertTriangle,
  SprayCan,
  CheckCircle,
  Recycle,
  Factory,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { DEFAULT_DASHBOARD_TIMEFRAME } from "@/lib/dashboard-timeframe";
import { formatNumber } from "@/lib/utils";
import { parseDashboardResponse } from "@/lib/parse-dashboard";
import type { DashboardStats } from "@/types";

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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch(`/api/dashboard?range=${DEFAULT_DASHBOARD_TIMEFRAME}`)
      .then(async (response) => {
        try {
          const data = response.ok ? await response.json() : {};
          return parseDashboardResponse(data);
        } catch {
          return parseDashboardResponse(null);
        }
      })
      .then(({ stats: nextStats }) => setStats(nextStats))
      .catch(() => setStats(parseDashboardResponse(null).stats));
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of aluminium profile inventory and operations"
      />

      <div className="mb-6 grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        <StatCard
          title="NOS"
          value={formatNumber(stats?.totalProfiles ?? 0)}
          icon={Boxes}
          href="/profiles"
        />
        <StatCard
          title="Available Stock"
          value={formatNumber(stats?.availableStock ?? 0)}
          subtitle="Total pieces in inventory"
          icon={Package}
          variant="success"
          href="/stock-master"
        />
        <StatCard
          title="Low Stock"
          value={formatNumber(stats?.lowStockProfiles ?? 0)}
          subtitle="Below minimum level"
          icon={AlertTriangle}
          variant="warning"
          href="/stock-master"
        />
        <StatCard
          title="Consumption"
          value={formatNumber(stats?.totalConsumption ?? 0)}
          subtitle="Units consumed"
          icon={Factory}
          href="/consumption"
        />
        <StatCard
          title="Pending Coating"
          value={formatNumber(stats?.pendingCoating ?? 0)}
          icon={SprayCan}
          variant="warning"
          href="/powder-coating"
        />
        <StatCard
          title="Completed Coating"
          value={formatNumber(stats?.completedCoating ?? 0)}
          icon={CheckCircle}
          variant="success"
          href="/powder-coating"
        />
        <StatCard
          title="Scrap Quantity"
          value={formatNumber(stats?.scrapQuantity ?? 0)}
          subtitle="Total scrapped pieces"
          icon={Recycle}
          variant="danger"
          href="/scrap"
        />
      </div>

      <DashboardCharts />
    </div>
  );
}
