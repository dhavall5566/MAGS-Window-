import type { Profile, SeriesName } from "@/types";
import { getUniqueProfileSeries } from "@/lib/profile";

export function getSeriesLabel(
  series: Pick<SeriesName, "name" | "seriesNo" | "seriesSuffix">
): string {
  const base = `${series.name}${series.seriesNo}`;
  const suffix = series.seriesSuffix?.trim();
  return suffix ? `${base} ${suffix}` : base;
}

export function getActiveSeriesLabels(
  seriesNames: Array<{
    name: string;
    seriesNo: string;
    seriesSuffix?: string;
    status?: string;
  }>
): string[] {
  return seriesNames
    .filter((series) => series.status !== "inactive")
    .map((series) => getSeriesLabel(series))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** Series Name master only — used for filters and add profile. */
export function getSeriesFormOptions(
  seriesNames: Array<{
    name: string;
    seriesNo: string;
    seriesSuffix?: string;
    status?: string;
  }>,
  currentLabel?: string
): string[] {
  const active = getActiveSeriesLabels(seriesNames);
  if (currentLabel && !active.includes(currentLabel)) {
    return [currentLabel, ...active];
  }
  return active;
}

export function seriesLabelToSeriesName(label: string, index: number): SeriesName {
  const match = label.match(/^([A-Za-z]{1,3})(\d[\dA-Za-z]*)$/);
  if (match) {
    return {
      id: `ser-${String(index + 1).padStart(3, "0")}`,
      name: match[1].toUpperCase(),
      seriesNo: match[2],
      status: "active",
      createdAt: "2024-01-01",
    };
  }
  return {
    id: `ser-${String(index + 1).padStart(3, "0")}`,
    name: label,
    seriesNo: "",
    status: "active",
    createdAt: "2024-01-01",
  };
}

export function deriveSeriesNamesFromProfiles(profiles: Profile[]): SeriesName[] {
  return getUniqueProfileSeries(profiles).map(seriesLabelToSeriesName);
}
