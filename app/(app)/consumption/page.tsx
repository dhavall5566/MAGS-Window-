"use client";

import { useCallback, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useProfileCodeFilters } from "@/components/shared/profile-code-filters";
import { buildOutwardConsumptionFromChallans } from "@/lib/challan-consumption";
import {
  calculateTotalProfiles,
  formatStockLength,
  STOCK_INWARD_KG_PER_METER,
} from "@/lib/stock-inward-calculations";
import { formatDate, formatNumber } from "@/lib/utils";
import { useCachedOrStoreList } from "@/hooks/use-seeded-list-state";
import { enrichChallanVendorDetails } from "@/lib/vendor";
import { useAppStore } from "@/lib/store";
import type { Challan, Consumption } from "@/types";

const selectStoreChallans = (state: ReturnType<typeof useAppStore.getState>) =>
  state.challans ?? [];

export default function ConsumptionPage() {
  const storeChallans = useAppStore((s) => s.challans);
  const vendors = useAppStore((s) => s.vendors);
  const [apiChallans, setApiChallans] = useCachedOrStoreList(
    "/api/challans",
    "challans",
    selectStoreChallans
  );

  const data = useMemo(() => {
    const enrichedStore = (storeChallans ?? []).map((challan) =>
      enrichChallanVendorDetails(challan, vendors ?? [])
    );
    const enrichedApi = apiChallans.map((challan) =>
      enrichChallanVendorDetails(challan, vendors ?? [])
    );
    return buildOutwardConsumptionFromChallans(enrichedApi, enrichedStore).sort((a, b) => {
      const dateSort = (b.date ?? "").localeCompare(a.date ?? "");
      if (dateSort !== 0) return dateSort;
      return (b.consumptionNo ?? "").localeCompare(a.consumptionNo ?? "");
    });
  }, [apiChallans, storeChallans, vendors]);

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
      header: "Outward Challan",
      className: "whitespace-nowrap font-mono text-xs",
      align: "left" as const,
      render: (row: Consumption) => row.challanNumber ?? "—",
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
      render: (row: Consumption) => formatStockLength(row.length),
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
        description="Auto-synced from outward challans — each line item issued on an outward challan appears here"
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
