"use client";

import { useEffect, useState } from "react";
import { fetchJson, getCachedJson } from "@/lib/fetch-json";

type ReportsAnalytics = Record<string, unknown>;

function readReportsAnalytics(): ReportsAnalytics {
  if (typeof window === "undefined") return {};
  return getCachedJson<ReportsAnalytics>("/api/reports") ?? {};
}

function hasReportsAnalyticsCache(): boolean {
  return getCachedJson("/api/reports") != null;
}

/** Analytics payload for report charts/PDF — seeded from prefetch cache on first render. */
export function useReportsAnalytics(): ReportsAnalytics {
  const [data, setData] = useState<ReportsAnalytics>(() => readReportsAnalytics());

  useEffect(() => {
    if (hasReportsAnalyticsCache()) {
      setData(readReportsAnalytics());
      return;
    }

    let cancelled = false;

    void fetchJson<ReportsAnalytics>("/api/reports").then((response) => {
      if (!cancelled) setData(response);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
