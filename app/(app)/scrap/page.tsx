"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { formatDate, formatNumber } from "@/lib/utils";
import { fetchJson, getCachedJson } from "@/lib/fetch-json";
import { useAppStore } from "@/lib/store";
import type { Scrap } from "@/types";

export default function ScrapPage() {
  const [data, setData] = useState<Scrap[]>([]);

  useEffect(() => {
    const cached = getCachedJson<{ scrap?: Scrap[] }>("/api/scrap")?.scrap ?? [];
    if (cached.length > 0) {
      setData(cached);
    } else {
      setData(useAppStore.getState().scrap ?? []);
    }

    fetchJson<{ scrap?: Scrap[] }>("/api/scrap").then((d) => setData(d?.scrap ?? []));
  }, []);

  const handleSearch = useCallback((row: Scrap, query: string) => {
    const q = query.toLowerCase();
    return (
      row.scrapNo?.toLowerCase().includes(q) ||
      row.profileCode?.toLowerCase().includes(q) ||
      row.profileName?.toLowerCase().includes(q) ||
      row.reason?.toLowerCase().includes(q) ||
      row.disposition?.toLowerCase().includes(q)
    );
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "scrapNo",
        header: "Scrap No",
        className: "whitespace-nowrap font-mono text-xs font-medium",
        align: "left" as const,
      },
      {
        key: "date",
        header: "Date",
        className: "whitespace-nowrap text-muted-foreground",
        align: "left" as const,
        render: (row: Scrap) => formatDate(row.date ?? ""),
      },
      {
        key: "profileCode",
        header: "Profile Code",
        className: "whitespace-nowrap font-mono text-xs",
        align: "left" as const,
      },
      {
        key: "profileName",
        header: "Profile Name",
        className: "min-w-[160px] truncate font-medium",
        align: "left" as const,
        render: (row: Scrap) => (
          <span className="block truncate" title={row.profileName}>
            {row.profileName}
          </span>
        ),
      },
      {
        key: "quantity",
        header: "Qty",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: Scrap) => formatNumber(row.quantity ?? 0),
      },
      {
        key: "weight",
        header: "Weight (kg)",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: Scrap) => formatNumber(row.weight ?? 0, 1),
      },
      {
        key: "reason",
        header: "Reason",
        className: "min-w-[140px] truncate",
        align: "left" as const,
        render: (row: Scrap) => (
          <span className="block truncate" title={row.reason}>
            {row.reason}
          </span>
        ),
      },
      {
        key: "disposition",
        header: "Disposition",
        className: "whitespace-nowrap",
        align: "left" as const,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Scrap Management"
        description="Record and track scrapped aluminium profile material"
      />
      <DataTable
        tableId="scrap"
        data={data}
        columns={columns}
        searchFilter={handleSearch}
        searchPlaceholder="Search scrap no, profile, reason, or disposition..."
      />
    </div>
  );
}
