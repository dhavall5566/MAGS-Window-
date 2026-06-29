"use client";

import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
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
  return useAppStore(
    useShallow((s) => ({
      profiles: s.profiles ?? [],
      stockInward: s.stockInward ?? [],
      deletedStockInwardIds: s.deletedStockInwardIds ?? [],
      challans: s.challans ?? [],
      powderCoating: s.powderCoating ?? [],
      lowStockThresholdKg: s.settings.lowStockThresholdKg,
    }))
  );
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
    [
      source.profiles,
      source.stockInward,
      source.deletedStockInwardIds,
      source.challans,
      source.powderCoating,
      source.lowStockThresholdKg,
      apiProfiles,
      apiInward,
      apiChallans,
      apiPowderCoating,
    ]
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
