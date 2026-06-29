"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { SeriesRowActions } from "@/components/series/series-row-actions";
import { Badge } from "@/components/ui/badge";
import {
  combineTableFilters,
  useDateRangeFilter,
} from "@/components/shared/date-range-filter";
import { useSeriesNameFilters, matchesSeriesSearch } from "@/components/shared/use-series-name-filters";
import { syncListCache } from "@/lib/list-cache-sync";
import { createSeriesApi, deleteSeriesApi, updateSeriesApi } from "@/lib/series-api";
import { alertSyncFailure } from "@/lib/sync-alert";
import { getSeriesLabel, resolveSeriesProfileCount } from "@/lib/series";
import { formatDate, formatNumber } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useModuleCrud } from "@/hooks/use-module-crud";
import type { SeriesName } from "@/types";

const AddSeriesDialog = dynamic(
  () => import("@/components/series/add-series-dialog").then((m) => m.AddSeriesDialog),
  { ssr: false }
);

const EditSeriesDialog = dynamic(
  () => import("@/components/series/edit-series-dialog").then((m) => m.EditSeriesDialog),
  { ssr: false }
);

export default function SeriesNamePage() {
  const { canCreate, canUpdate, canDelete } = useModuleCrud("series");
  const [editingSeries, setEditingSeries] = useState<SeriesName | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const series = useAppStore((s) => s.seriesNames);
  const profiles = useAppStore((s) => s.profiles);
  const addSeriesName = useAppStore((s) => s.addSeriesName);
  const updateSeriesName = useAppStore((s) => s.updateSeriesName);
  const deleteSeriesName = useAppStore((s) => s.deleteSeriesName);
  const toggleSeriesStatus = useAppStore((s) => s.toggleSeriesStatus);

  const profileCountsBySeriesId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of series ?? []) {
      counts.set(entry.id, resolveSeriesProfileCount(entry, profiles ?? []));
    }
    return counts;
  }, [series, profiles]);

  const { filterContent, filtersActive, clearFilters, matchesSeries } =
    useSeriesNameFilters(series ?? []);

  const {
    filterContent: dateFilterContent,
    filtersActive: dateFiltersActive,
    clearFilters: clearDateFilters,
    matchesDate,
  } = useDateRangeFilter({ label: "Created" });

  const filteredSeries = useMemo(
    () =>
      (series ?? []).filter(
        (row) => matchesSeries(row) && matchesDate(row.createdAt)
      ),
    [series, matchesSeries, matchesDate]
  );

  const handleClearAllFilters = useCallback(() => {
    clearFilters();
    clearDateFilters();
  }, [clearFilters, clearDateFilters]);

  const handleSeriesSearch = useCallback((row: SeriesName, query: string) => {
    return matchesSeriesSearch(row, query);
  }, []);

  const handleAddSeries = useCallback(
    async (entry: SeriesName) => {
      addSeriesName(entry);
      syncListCache("/api/series", "series", useAppStore.getState().seriesNames ?? []);
      const saved = await createSeriesApi(entry);
      if (!saved) {
        deleteSeriesName(entry.id);
        syncListCache("/api/series", "series", useAppStore.getState().seriesNames ?? []);
        alertSyncFailure("Could not save series to the server.");
        return;
      }
      updateSeriesName(saved.id, saved);
      syncListCache("/api/series", "series", useAppStore.getState().seriesNames ?? []);
    },
    [addSeriesName, deleteSeriesName, updateSeriesName]
  );

  const handleUpdateSeries = useCallback(
    async (id: string, updates: Partial<SeriesName>) => {
      const current = (useAppStore.getState().seriesNames ?? []).find((item) => item.id === id);
      if (!current) return;

      updateSeriesName(id, updates);
      syncListCache("/api/series", "series", useAppStore.getState().seriesNames ?? []);
      const saved = await updateSeriesApi(id, updates);
      if (!saved) {
        updateSeriesName(id, current);
        syncListCache("/api/series", "series", useAppStore.getState().seriesNames ?? []);
        alertSyncFailure("Could not update series on the server.");
        return;
      }
      updateSeriesName(saved.id, saved);
      syncListCache("/api/series", "series", useAppStore.getState().seriesNames ?? []);
    },
    [updateSeriesName]
  );

  const handleToggleStatus = useCallback(
    async (id: string) => {
      const current = (useAppStore.getState().seriesNames ?? []).find((item) => item.id === id);
      if (!current) return;
      const nextStatus = current.status === "active" ? "inactive" : "active";
      toggleSeriesStatus(id);
      syncListCache("/api/series", "series", useAppStore.getState().seriesNames ?? []);
      const saved = await updateSeriesApi(id, { status: nextStatus });
      if (!saved) {
        toggleSeriesStatus(id);
        syncListCache("/api/series", "series", useAppStore.getState().seriesNames ?? []);
        alert("Could not update series status. Please check that the backend is running.");
      } else {
        updateSeriesName(saved.id, saved);
        syncListCache("/api/series", "series", useAppStore.getState().seriesNames ?? []);
      }
    },
    [toggleSeriesStatus, updateSeriesName]
  );

  const handleDeleteSeries = useCallback(
    async (entry: SeriesName) => {
      const linkedCount = resolveSeriesProfileCount(
        entry,
        useAppStore.getState().profiles ?? []
      );
      if (linkedCount > 0) {
        alert(
          `Cannot delete ${getSeriesLabel(entry)} because ${linkedCount} profile(s) in Profile Master are linked to it.`
        );
        return;
      }

      if (!confirm(`Delete series ${getSeriesLabel(entry)}? This cannot be undone.`)) return;

      deleteSeriesName(entry.id);
      syncListCache("/api/series", "series", useAppStore.getState().seriesNames ?? []);

      const result = await deleteSeriesApi(entry.id);
      if (!result.ok) {
        useAppStore.setState((state) => ({
          seriesNames: [...(state.seriesNames ?? []), entry],
        }));
        syncListCache("/api/series", "series", useAppStore.getState().seriesNames ?? []);
        alert(result.error);
      }
    },
    [deleteSeriesName]
  );

  const handleEdit = useCallback((row: SeriesName) => {
    setEditingSeries(row);
    setEditOpen(true);
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Series Name",
        className: "whitespace-nowrap font-mono text-sm font-medium",
        align: "left" as const,
        render: (row: SeriesName) => row.name,
      },
      {
        key: "seriesNo",
        header: "Series No.",
        className: "whitespace-nowrap font-mono text-sm",
        align: "left" as const,
        render: (row: SeriesName) => row.seriesNo,
      },
      {
        key: "label",
        header: "Full Series",
        className: "whitespace-nowrap font-mono text-sm font-medium",
        align: "left" as const,
        sortValue: (row: SeriesName) => getSeriesLabel(row),
        render: (row: SeriesName) => getSeriesLabel(row),
      },
      {
        key: "profileCount",
        header: "No. of Profiles",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        sortValue: (row: SeriesName) =>
          profileCountsBySeriesId.get(row.id) ?? row.profileCount ?? 0,
        render: (row: SeriesName) =>
          formatNumber(profileCountsBySeriesId.get(row.id) ?? row.profileCount ?? 0),
      },
      {
        key: "status",
        header: "Status",
        className: "whitespace-nowrap",
        align: "left" as const,
        render: (row: SeriesName) => (
          <Badge variant={row.status === "active" ? "success" : "secondary"}>
            {row.status ?? "active"}
          </Badge>
        ),
      },
      {
        key: "createdAt",
        header: "Created",
        className: "whitespace-nowrap text-muted-foreground",
        align: "left" as const,
        render: (row: SeriesName) => formatDate(row.createdAt ?? ""),
      },
      {
        key: "actions",
        header: "Actions",
        className: "whitespace-nowrap",
        align: "right" as const,
        sticky: true,
        render: (row: SeriesName) => (
          <SeriesRowActions
            series={row}
            linkedProfileCount={profileCountsBySeriesId.get(row.id) ?? 0}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDeleteSeries}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        ),
      },
    ],
    [canDelete, canUpdate, handleDeleteSeries, handleEdit, handleToggleStatus, profileCountsBySeriesId]
  );

  return (
    <div>
      <PageHeader
        title="Series Name"
        description="Manage aluminium profile series used in profile master"
      >
        {canCreate ? <AddSeriesDialog onSave={handleAddSeries} /> : null}
      </PageHeader>
      <DataTable
        tableId="series-name"
        data={filteredSeries}
        columns={columns}
        searchFilter={handleSeriesSearch}
        searchPlaceholder="Search series name, number, or full series..."
        filterContent={combineTableFilters(filterContent, dateFilterContent)}
        filtersActive={filtersActive || dateFiltersActive}
        onClearFilters={handleClearAllFilters}
      />
      <EditSeriesDialog
        series={editingSeries}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleUpdateSeries}
      />
    </div>
  );
}
