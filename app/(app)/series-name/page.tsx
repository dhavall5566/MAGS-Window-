"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { AddSeriesDialog } from "@/components/series/add-series-dialog";
import { EditSeriesDialog } from "@/components/series/edit-series-dialog";
import { SeriesRowActions } from "@/components/series/series-row-actions";
import { Badge } from "@/components/ui/badge";
import { getSeriesLabel } from "@/lib/series";
import { formatDate } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import type { SeriesName } from "@/types";

export default function SeriesNamePage() {
  const [mounted, setMounted] = useState(false);
  const [editingSeries, setEditingSeries] = useState<SeriesName | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const series = useAppStore((s) => s.seriesNames);
  const addSeriesName = useAppStore((s) => s.addSeriesName);
  const updateSeriesName = useAppStore((s) => s.updateSeriesName);
  const toggleSeriesStatus = useAppStore((s) => s.toggleSeriesStatus);

  useEffect(() => {
    setMounted(true);
  }, []);

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
            onEdit={handleEdit}
            onToggleStatus={toggleSeriesStatus}
          />
        ),
      },
    ],
    [handleEdit, toggleSeriesStatus]
  );

  if (!mounted) {
    return (
      <div>
        <PageHeader
          title="Series Name"
          description="Manage aluminium profile series used in profile master"
        />
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Series Name"
        description="Manage aluminium profile series used in profile master"
      >
        <AddSeriesDialog onSave={addSeriesName} />
      </PageHeader>
      <DataTable
        tableId="series-name"
        data={series ?? []}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search series..."
      />
      <EditSeriesDialog
        series={editingSeries}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={updateSeriesName}
      />
    </div>
  );
}
