"use client";

import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useProfileCodeFilters } from "@/components/shared/profile-code-filters";
import { Badge } from "@/components/ui/badge";
import { formatStockLength } from "@/lib/stock-inward-calculations";
import { formatNumber } from "@/lib/utils";
import { useStockMasterRows } from "@/hooks/use-stock-derived-data";
import { useAppStore } from "@/lib/store";

export default function StockMasterPage() {
  const { highlightLowStock, lowStockThresholdKg } = useAppStore(
    useShallow((s) => ({
      highlightLowStock: s.settings.highlightLowStock,
      lowStockThresholdKg: s.settings.lowStockThresholdKg,
    }))
  );
  const rows = useStockMasterRows();

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
      formatStockLength(row.length).includes(q)
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
        key: "totalWeightManualKg",
        header: "Total Weight Manual (Kg)",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: (typeof rows)[number]) =>
          row.totalWeightManualKg != null
            ? formatNumber(row.totalWeightManualKg, 2)
            : "—",
      },
      {
        key: "length",
        header: "Length (m)",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: (typeof rows)[number]) =>
          row.length ? formatStockLength(row.length) : "—",
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
        description="Stock inward minus outward challan usage, grouped by profile and length"
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
