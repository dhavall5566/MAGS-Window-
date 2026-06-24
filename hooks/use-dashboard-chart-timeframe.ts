"use client";

import { useCallback, useEffect, useState } from "react";
import { parseDashboardResponse } from "@/lib/parse-dashboard";
import {
  DEFAULT_DASHBOARD_TIMEFRAME,
  readDashboardChartTimeframe,
  writeDashboardChartTimeframe,
  type DashboardChartId,
  type DashboardTimeframe,
} from "@/lib/dashboard-timeframe";

const CHART_DATA_KEYS = {
  inventory: "inventoryOverview",
  monthly: "monthlyStockMovement",
  consumption: "consumptionTrends",
  colors: "colorDistribution",
} as const;

export function useDashboardChartTimeframe<T>(chartId: DashboardChartId) {
  const [timeframe, setTimeframe] = useState<DashboardTimeframe>(DEFAULT_DASHBOARD_TIMEFRAME);
  const [data, setData] = useState<T[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeframe(readDashboardChartTimeframe(chartId));
    setReady(true);
  }, [chartId]);

  const loadChartData = useCallback(async (range: DashboardTimeframe) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard?range=${range}`);
      const payload = response.ok ? await response.json() : {};
      const { charts } = parseDashboardResponse(payload);
      const chartKey = CHART_DATA_KEYS[chartId];
      setData((charts[chartKey] ?? []) as T[]);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [chartId]);

  useEffect(() => {
    if (!ready) return;
    void loadChartData(timeframe);
  }, [ready, timeframe, loadChartData]);

  const updateTimeframe = (next: DashboardTimeframe) => {
    setTimeframe(next);
    writeDashboardChartTimeframe(chartId, next);
  };

  return {
    timeframe,
    updateTimeframe,
    data,
    ready,
    loading,
  };
}
