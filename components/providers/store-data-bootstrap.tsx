"use client";

import { useEffect } from "react";
import { prefetchAppData } from "@/lib/prefetch-app-data";
import { fetchJson } from "@/lib/fetch-json";
import { useAppStore } from "@/lib/store";
import type { Profile, SeriesName } from "@/types";

/** Prefetch API data after persist rehydrate; series always sync from backend. */
export function StoreDataBootstrap() {
  useEffect(() => {
    prefetchAppData();

    let cancelled = false;

    const bootstrap = async () => {
      if (!useAppStore.persist.hasHydrated()) {
        await useAppStore.persist.rehydrate();
      }
      if (cancelled) return;

      const [seriesResult, profilesResult] = await Promise.all([
        fetchJson<{ series?: SeriesName[] }>("/api/series"),
        useAppStore.getState().profiles.length === 0
          ? fetchJson<{ profiles?: Profile[] }>("/api/profiles")
          : Promise.resolve(null),
      ]);

      if (cancelled) return;

      const apiSeries = seriesResult.series ?? [];
      if (apiSeries.length > 0) {
        useAppStore.setState({ seriesNames: apiSeries });
      }

      const profiles = profilesResult?.profiles ?? [];
      if (profiles.length > 0 && useAppStore.getState().profiles.length === 0) {
        useAppStore.getState().setProfiles(profiles);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
