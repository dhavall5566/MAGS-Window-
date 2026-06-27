"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  buildDashboardLiveData,
  getDashboardChartData,
  type DashboardChartsData,
} from "@/lib/dashboard-live-data";
import {
  DEFAULT_DASHBOARD_TIMEFRAME,
  readDashboardChartTimeframe,
  writeDashboardChartTimeframe,
  type DashboardChartId,
  type DashboardTimeframe,
} from "@/lib/dashboard-timeframe";
import type { Challan, DashboardStats, PowderCoating, Profile, StockInward } from "@/types";

const CHART_DATA_KEYS: Record<DashboardChartId, keyof DashboardChartsData> = {
  inventory: "inventoryOverview",
  monthly: "monthlyStockMovement",
  consumption: "consumptionTrends",
  colors: "colorDistribution",
};

function useDashboardSourceData() {
  const profiles = useAppStore((s) => s.profiles);
  const stockInward = useAppStore((s) => s.stockInward);
  const deletedStockInwardIds = useAppStore((s) => s.deletedStockInwardIds);
  const challans = useAppStore((s) => s.challans);
  const powderCoating = useAppStore((s) => s.powderCoating);
  const lowStockThresholdKg = useAppStore((s) => s.settings.lowStockThresholdKg);

  return {
    profiles: profiles ?? [],
    stockInward: stockInward ?? [],
    deletedStockInwardIds: deletedStockInwardIds ?? [],
    challans: challans ?? [],
    powderCoating: powderCoating ?? [],
    lowStockThresholdKg,
  };
}

export function useDashboardLiveInput(
  apiProfiles: Profile[] = [],
  apiInward: StockInward[] = [],
  apiChallans: Challan[] = [],
  apiPowderCoating: PowderCoating[] = []
) {
  const source = useDashboardSourceData();

  return useMemo(
    () => ({
      profiles: source.profiles,
      apiProfiles,
      inward: source.stockInward,
      apiInward,
      deletedStockInwardIds: source.deletedStockInwardIds,
      apiChallans,
      storeChallans: source.challans,
      powderCoating: [...(apiPowderCoating ?? []), ...source.powderCoating].reduce<
        PowderCoating[]
      >((acc, entry) => {
        if (!entry?.id) return acc;
        const existing = acc.find((item) => item.id === entry.id);
        if (existing) Object.assign(existing, entry);
        else acc.push({ ...entry });
        return acc;
      }, []),
      lowStockThresholdKg: source.lowStockThresholdKg,
    }),
    [source, apiProfiles, apiInward, apiChallans, apiPowderCoating]
  );
}

export function useDashboardLiveStats(
  timeframe: DashboardTimeframe = DEFAULT_DASHBOARD_TIMEFRAME,
  apiProfiles: Profile[] = [],
  apiInward: StockInward[] = [],
  apiChallans: Challan[] = [],
  apiPowderCoating: PowderCoating[] = []
): DashboardStats {
  const input = useDashboardLiveInput(apiProfiles, apiInward, apiChallans, apiPowderCoating);

  return useMemo(
    () => buildDashboardLiveData({ ...input, timeframe }).stats,
    [input, timeframe]
  );
}

export function useDashboardChartTimeframe<T>(
  chartId: DashboardChartId,
  apiProfiles: Profile[] = [],
  apiInward: StockInward[] = [],
  apiChallans: Challan[] = [],
  apiPowderCoating: PowderCoating[] = []
) {
  const input = useDashboardLiveInput(apiProfiles, apiInward, apiChallans, apiPowderCoating);
  const [timeframe, setTimeframe] = useState<DashboardTimeframe>(DEFAULT_DASHBOARD_TIMEFRAME);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTimeframe(readDashboardChartTimeframe(chartId));
    setReady(true);
  }, [chartId]);

  const data = useMemo(() => {
    if (!ready) return [] as T[];
    const { charts } = buildDashboardLiveData({ ...input, timeframe });
    return getDashboardChartData(charts, CHART_DATA_KEYS[chartId]) as T[];
  }, [ready, input, timeframe, chartId]);

  const updateTimeframe = (next: DashboardTimeframe) => {
    setTimeframe(next);
    writeDashboardChartTimeframe(chartId, next);
  };

  return {
    timeframe,
    updateTimeframe,
    data,
    ready,
    loading: false,
  };
}
