"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useProfileCodeFilters } from "@/components/shared/profile-code-filters";
import { Badge } from "@/components/ui/badge";
import { mergeManualConsumption } from "@/lib/challan-consumption";
import { buildStockMasterRows, mergeStockInward } from "@/lib/stock-master";
import { formatNumber } from "@/lib/utils";
import { fetchJson, getCachedJson } from "@/lib/fetch-json";
import { useAppStore } from "@/lib/store";
import type { Consumption, StockInward } from "@/types";

export default function StockMasterPage() {
  const storeInward = useAppStore((s) => s.stockInward);
  const deletedStockInwardIds = useAppStore((s) => s.deletedStockInwardIds);
  const storeConsumption = useAppStore((s) => s.consumption);
  const highlightLowStock = useAppStore((s) => s.settings.highlightLowStock);
  const lowStockThresholdKg = useAppStore((s) => s.settings.lowStockThresholdKg);
  const [inward, setInward] = useState<StockInward[]>([]);
  const [consumption, setConsumption] = useState<Consumption[]>([]);

  useEffect(() => {
    setInward(
      mergeStockInward(
        getCachedJson<{ inward?: StockInward[] }>("/api/stock")?.inward ?? [],
        useAppStore.getState().stockInward ?? [],
        useAppStore.getState().deletedStockInwardIds ?? []
      )
    );
    setConsumption(
      mergeManualConsumption(
        getCachedJson<{ consumption?: Consumption[] }>("/api/consumption")?.consumption ?? [],
        useAppStore.getState().consumption ?? []
      )
    );
  }, []);

  useEffect(() => {
    fetchJson<{ inward?: StockInward[] }>("/api/stock").then((d) => {
      setInward(
        mergeStockInward(d?.inward ?? [], storeInward ?? [], deletedStockInwardIds ?? [])
      );
    });
  }, [storeInward, deletedStockInwardIds]);

  useEffect(() => {
    fetchJson<{ consumption?: Consumption[] }>("/api/consumption").then((d) => {
      setConsumption(mergeManualConsumption(d?.consumption ?? [], storeConsumption ?? []));
    });
  }, [storeConsumption]);

  const rows = useMemo(
    () => buildStockMasterRows(inward, consumption),
    [inward, consumption]
  );

  const profileCodes = useMemo(
    () => rows.map((row) => row.profileCode).filter(Boolean),
    [rows]
  );

  const { filterContent, filtersActive, clearFilters, matchesCode } =
    useProfileCodeFilters(profileCodes);

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesCode(row.profileCode)),
    [rows, matchesCode]
  );

  const handleSearch = useCallback((row: (typeof rows)[number], query: string) => {
    const q = query.toLowerCase();
    return (
      row.profileName.toLowerCase().includes(q) ||
      row.profileCode.toLowerCase().includes(q) ||
      formatNumber(row.length, 4).includes(q)
    );
  }, []);

  const isLowStock = useCallback(
    (row: (typeof rows)[number]) => row.stockKg <= lowStockThresholdKg,
    [lowStockThresholdKg]
  );

  const columns = useMemo(
    () => [
      {
        key: "profileCode",
        header: "Profile Code",
        className: "whitespace-nowrap font-mono text-xs font-medium",
        align: "left" as const,
        render: (row: (typeof rows)[number]) => row.profileCode,
      },
      {
        key: "profileName",
        header: "Profile Name",
        className: "min-w-[180px] font-medium",
        align: "left" as const,
        render: (row: (typeof rows)[number]) => row.profileName,
      },
      {
        key: "totalWeightKg",
        header: "Total Weight (kg)",
        className: "whitespace-nowrap tabular-nums font-semibold",
        align: "center" as const,
        render: (row: (typeof rows)[number]) => (
          <div className="flex items-center justify-center gap-2">
            <span>{formatNumber(row.totalWeightKg, 2)}</span>
            {highlightLowStock && isLowStock(row) && (
              <Badge variant="destructive" className="text-[10px]">
                Low
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: "length",
        header: "Length (m)",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: (typeof rows)[number]) =>
          row.length ? formatNumber(row.length, 4) : "—",
      },
      {
        key: "kgPerMeter",
        header: "Kg/m",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: (typeof rows)[number]) =>
          row.kgPerMeter ? formatNumber(row.kgPerMeter, 2) : "—",
      },
      {
        key: "totalProfiles",
        header: "NOS",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: (typeof rows)[number]) =>
          row.totalProfiles ? formatNumber(row.totalProfiles, 2) : "—",
      },
    ],
    [highlightLowStock, isLowStock]
  );

  return (
    <div>
      <PageHeader
        title="Stock Master"
        description="Stock inward minus consumption, grouped by profile and length"
      />
      <DataTable
        tableId="stock-master"
        data={filteredRows}
        columns={columns}
        searchFilter={handleSearch}
        searchPlaceholder="Search by profile name or code..."
        filterContent={filterContent}
        filtersActive={filtersActive}
        onClearFilters={clearFilters}
        isRowMuted={
          highlightLowStock ? (row) => isLowStock(row) : undefined
        }
      />
    </div>
  );
}
