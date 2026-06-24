"use client";

import { useCallback, useMemo, useState } from "react";
import {
  SearchableSelect,
  stringSelectOptions,
} from "@/components/ui/searchable-select";
import {
  getUniqueCodesForSeriesFromProfileCodes,
  getUniqueSeriesFromProfileCodes,
  matchesProfileCodeFilters,
} from "@/lib/profile";

interface ProfileCodeFiltersProps {
  seriesFilter: string;
  codeFilter: string;
  seriesOptions: string[];
  codeOptions: string[];
  onSeriesChange: (series: string) => void;
  onCodeChange: (code: string) => void;
}

export function ProfileCodeFilters({
  seriesFilter,
  codeFilter,
  seriesOptions,
  codeOptions,
  onSeriesChange,
  onCodeChange,
}: ProfileCodeFiltersProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="w-full text-xs font-medium text-muted-foreground sm:w-auto">Filter</span>
      <SearchableSelect
        value={seriesFilter || "all"}
        onValueChange={(value) => {
          onSeriesChange(value === "all" ? "" : value);
          onCodeChange("");
        }}
        options={[
          { value: "all", label: "All series" },
          ...stringSelectOptions(seriesOptions, "font-mono"),
        ]}
        placeholder="All series"
        searchPlaceholder="Search series…"
        className="h-10 w-full min-w-0 bg-background sm:w-[160px]"
        contentClassName="sm:min-w-[220px]"
      />
      <SearchableSelect
        value={codeFilter || "all"}
        onValueChange={(value) => onCodeChange(value === "all" ? "" : value)}
        disabled={!seriesFilter}
        options={[
          { value: "all", label: "All codes" },
          ...stringSelectOptions(codeOptions, "font-mono"),
        ]}
        placeholder={seriesFilter ? "All codes" : "Select series"}
        searchPlaceholder="Search codes…"
        className="h-10 w-full min-w-0 bg-background sm:w-[176px]"
        contentClassName="sm:min-w-[220px]"
      />
    </div>
  );
}

export function useProfileCodeFilters(profileCodes: string[]) {
  const [seriesFilter, setSeriesFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");

  const seriesOptions = useMemo(
    () => getUniqueSeriesFromProfileCodes(profileCodes),
    [profileCodes]
  );

  const codeOptions = useMemo(
    () =>
      seriesFilter
        ? getUniqueCodesForSeriesFromProfileCodes(profileCodes, seriesFilter)
        : [],
    [profileCodes, seriesFilter]
  );

  const filtersActive = Boolean(seriesFilter || codeFilter);

  const clearFilters = useCallback(() => {
    setSeriesFilter("");
    setCodeFilter("");
  }, []);

  const matchesCode = useCallback(
    (profileCode: string) =>
      matchesProfileCodeFilters(profileCode, seriesFilter, codeFilter),
    [seriesFilter, codeFilter]
  );

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
    seriesOptions,
    codeOptions,
    filtersActive,
    clearFilters,
    matchesCode,
    filterContent,
  };
}
