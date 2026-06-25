"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useProfileCodeFilters } from "@/components/shared/profile-code-filters";
import { Badge } from "@/components/ui/badge";
import { mergeManualConsumption } from "@/lib/challan-consumption";
import {
  calculateTotalProfiles,
  STOCK_INWARD_KG_PER_METER,
} from "@/lib/stock-inward-calculations";
import { formatDate, formatNumber } from "@/lib/utils";
import { fetchJson, getCachedJson } from "@/lib/fetch-json";
import { useAppStore } from "@/lib/store";
import type { Consumption } from "@/types";

function getInitialConsumption(storeConsumption: Consumption[]): Consumption[] {
  const cached =
    getCachedJson<{ consumption?: Consumption[] }>("/api/consumption")?.consumption ?? [];
  return mergeManualConsumption(cached, storeConsumption);
}

export default function ConsumptionPage() {
  const storeConsumption = useAppStore((s) => s.consumption);
  const [data, setData] = useState<Consumption[]>([]);

  useEffect(() => {
    setData(getInitialConsumption(useAppStore.getState().consumption ?? []));
    fetchJson<{ consumption?: Consumption[] }>("/api/consumption").then((d) => {
      setData(mergeManualConsumption(d?.consumption ?? [], storeConsumption ?? []));
    });
  }, [storeConsumption]);

  const profileCodes = useMemo(
    () => data.map((row) => row.profileCode).filter(Boolean),
    [data]
  );

  const { filterContent, filtersActive, clearFilters, matchesCode } =
    useProfileCodeFilters(profileCodes);

  const filteredData = useMemo(
    () => data.filter((row) => matchesCode(row.profileCode)),
    [data, matchesCode]
  );

  const handleSearch = useCallback((row: Consumption, query: string) => {
    const q = query.toLowerCase();
    return (
      row.consumptionNo?.toLowerCase().includes(q) ||
      row.challanNumber?.toLowerCase().includes(q) ||
      row.profileCode?.toLowerCase().includes(q) ||
      row.profileName?.toLowerCase().includes(q) ||
      row.projectName?.toLowerCase().includes(q)
    );
  }, []);

  const columns = [
    {
      key: "consumptionNo",
      header: "Consumption No",
      className: "whitespace-nowrap font-mono text-xs font-medium",
      align: "left" as const,
    },
    {
      key: "date",
      header: "Date",
      className: "whitespace-nowrap text-muted-foreground",
      align: "left" as const,
      render: (row: Consumption) => formatDate(row.date ?? ""),
    },
    {
      key: "challanNumber",
      header: "Challan",
      className: "whitespace-nowrap font-mono text-xs",
      align: "left" as const,
      render: (row: Consumption) => row.challanNumber ?? "—",
    },
    {
      key: "challanType",
      header: "Type",
      className: "whitespace-nowrap",
      align: "left" as const,
      render: (row: Consumption) =>
        row.challanType ? (
          <Badge variant="outline" className="text-xs">
            {row.challanType.replace("_", " ")}
          </Badge>
        ) : (
          "—"
        ),
    },
    {
      key: "projectName",
      header: "Vendor / Project",
      className: "min-w-[160px] truncate",
      align: "left" as const,
      render: (row: Consumption) => (
        <span className="block truncate" title={row.projectName}>
          {row.projectName}
        </span>
      ),
    },
    {
      key: "profileName",
      header: "Profile Name",
      className: "min-w-[140px] truncate",
      align: "left" as const,
      render: (row: Consumption) => (
        <span className="block truncate" title={row.profileName}>
          {row.profileName}
        </span>
      ),
    },
    {
      key: "totalWeightKg",
      header: "Total Weight (kg)",
      className: "whitespace-nowrap tabular-nums",
      align: "center" as const,
      render: (row: Consumption) =>
        formatNumber(Math.abs(row.weight ?? 0), 2),
    },
    {
      key: "length",
      header: "Length (m)",
      className: "whitespace-nowrap tabular-nums",
      align: "center" as const,
      render: (row: Consumption) => formatNumber(row.length ?? 0, 4),
    },
    {
      key: "kgPerMeter",
      header: "Kg/m",
      className: "whitespace-nowrap tabular-nums",
      align: "center" as const,
      render: () => formatNumber(STOCK_INWARD_KG_PER_METER, 2),
    },
    {
      key: "totalProfiles",
      header: "NOS",
      className: "whitespace-nowrap tabular-nums",
      align: "center" as const,
      render: (row: Consumption) => {
        const totalWeightKg = Math.abs(row.weight ?? 0);
        const length = row.length ?? 0;
        return formatNumber(
          calculateTotalProfiles(totalWeightKg, length, STOCK_INWARD_KG_PER_METER),
          2
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Material Consumption"
        description="Auto-synced from challans — outward and coating subtract stock, returns add it back"
      />
      <DataTable
        tableId="consumption"
        data={filteredData}
        columns={columns}
        searchFilter={handleSearch}
        searchPlaceholder="Search consumption, challan, or profile..."
        filterContent={filterContent}
        filtersActive={filtersActive}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
