"use client";

import { useCallback, useMemo, useState } from "react";
import {
  SearchableSelect,
  stringSelectOptions,
} from "@/components/ui/searchable-select";
import { getSeriesLabel } from "@/lib/series";
import type { SeriesName } from "@/types";

export function useSeriesNameFilters(series: SeriesName[]) {
  const [nameFilter, setNameFilter] = useState("");

  const nameOptions = useMemo(() => {
    const names = new Set<string>();
    for (const entry of series) {
      const name = entry.name?.trim();
      if (name) names.add(name);
    }
    return Array.from(names).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [series]);

  const filtersActive = Boolean(nameFilter);

  const clearFilters = useCallback(() => {
    setNameFilter("");
  }, []);

  const matchesSeries = useCallback(
    (entry: SeriesName) => {
      if (!nameFilter) return true;
      return (entry.name?.trim() ?? "") === nameFilter;
    },
    [nameFilter]
  );

  const filterContent = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="w-full text-xs font-medium text-muted-foreground sm:w-auto">
        Filter
      </span>
      <SearchableSelect
        value={nameFilter || "all"}
        onValueChange={(value) => setNameFilter(value === "all" ? "" : value)}
        options={[
          { value: "all", label: "All series names" },
          ...stringSelectOptions(nameOptions, "font-mono"),
        ]}
        placeholder="All series names"
        searchPlaceholder="Search series name…"
        className="h-10 w-full min-w-0 bg-background sm:w-[180px]"
        contentClassName="sm:min-w-[220px]"
      />
    </div>
  );

  return {
    nameFilter,
    nameOptions,
    filtersActive,
    clearFilters,
    matchesSeries,
    filterContent,
  };
}

export function matchesSeriesSearch(entry: SeriesName, query: string): boolean {
  const q = query.toLowerCase();
  const name = entry.name?.toLowerCase() ?? "";
  const seriesNo = entry.seriesNo?.toLowerCase() ?? "";
  const label = getSeriesLabel(entry).toLowerCase();
  return name.includes(q) || seriesNo.includes(q) || label.includes(q);
}
