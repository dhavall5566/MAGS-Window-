"use client";

import { useMemo, useState } from "react";
import { ProfileCodeFilters } from "@/components/shared/profile-code-filters";
import {
  getProfileCodeValue,
  getProfileSeriesAndCode,
  getUniqueProfileCodesForSeries,
} from "@/lib/profile";
import { getActiveSeriesLabels } from "@/lib/series";
import { useAppStore } from "@/lib/store";
import type { Profile } from "@/types";

export function useProfileFilters(profiles: Profile[]) {
  const [seriesFilter, setSeriesFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const seriesNames = useAppStore((s) => s.seriesNames);

  const seriesOptions = useMemo(
    () => getActiveSeriesLabels(seriesNames ?? []),
    [seriesNames]
  );

  const codeOptions = useMemo(
    () =>
      seriesFilter ? getUniqueProfileCodesForSeries(profiles, seriesFilter) : [],
    [profiles, seriesFilter]
  );

  const filtersActive = Boolean(seriesFilter || codeFilter);

  const clearFilters = () => {
    setSeriesFilter("");
    setCodeFilter("");
  };

  const matchesProfile = (profile: Profile) => {
    const { series, code } = getProfileSeriesAndCode(profile);
    if (seriesFilter && series !== seriesFilter) return false;
    if (codeFilter && code !== codeFilter) return false;
    return true;
  };

  const filterContent = (
    <ProfileCodeFilters
      seriesFilter={seriesFilter}
      codeFilter={codeFilter}
      seriesOptions={seriesOptions}
      codeOptions={codeOptions}
      onSeriesChange={setSeriesFilter}
      onCodeChange={setCodeFilter}
    />
  );

  return {
    seriesFilter,
    codeFilter,
    filtersActive,
    clearFilters,
    matchesProfile,
    filterContent,
  };
}

export function getProfileCodesFromProfiles(profiles: Profile[]): string[] {
  return profiles
    .map((profile) => getProfileCodeValue(profile))
    .filter(Boolean);
}
