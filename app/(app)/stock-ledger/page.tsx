"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import {
  combineTableFilters,
  useDateRangeFilter,
} from "@/components/shared/date-range-filter";
import { useProfileCodeFilters } from "@/components/shared/profile-code-filters";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatStockLength, formatNos } from "@/lib/stock-inward-calculations";
import { formatDate, formatNumber } from "@/lib/utils";
import { useStockLedgerRows } from "@/hooks/use-stock-derived-data";
import type { StockLedgerEntry } from "@/types";

type LedgerTypeFilter = "all" | StockLedgerEntry["type"];

const LEDGER_TYPE_TABS: { value: LedgerTypeFilter; label: string }[] = [
  { value: "all", label: "All Entries" },
  { value: "inward", label: "Inward" },
  { value: "consumption", label: "Consumption" },
  { value: "coating_sent", label: "Coating Sent" },
];

export default function StockLedgerPage() {
  const ledger = useStockLedgerRows();
  const [activeTypeTab, setActiveTypeTab] = useState<LedgerTypeFilter>("all");

  const profileCodes = useMemo(
    () => ledger.map((row) => row.profileCode).filter(Boolean),
    [ledger]
  );

  const { filterContent, filtersActive, clearFilters, matchesCode } =
    useProfileCodeFilters(profileCodes);

  const {
    filterContent: dateFilterContent,
    filtersActive: dateFiltersActive,
    clearFilters: clearDateFilters,
    matchesDate,
  } = useDateRangeFilter();

  const filteredLedger = useMemo(() => {
    const byProfile = ledger.filter(
      (row) => matchesCode(row.profileCode) && matchesDate(row.date)
    );
    if (activeTypeTab === "all") return byProfile;
    return byProfile.filter((row) => row.type === activeTypeTab);
  }, [ledger, matchesCode, matchesDate, activeTypeTab]);

  const handleClearFilters = useCallback(() => {
    clearFilters();
    clearDateFilters();
    setActiveTypeTab("all");
  }, [clearFilters, clearDateFilters]);

  const typeFilterActive = activeTypeTab !== "all";

  const tableFilters = combineTableFilters(filterContent, dateFilterContent);

  const handleLedgerSearch = useCallback((row: StockLedgerEntry, query: string) => {
    const q = query.toLowerCase();
    const code = row.profileCode?.toLowerCase() ?? "";
    const name = row.profileName?.toLowerCase() ?? "";
    const reference = row.reference?.toLowerCase() ?? "";
    return code.includes(q) || name.includes(q) || reference.includes(q);
  }, []);

  const getReferenceHref = (row: StockLedgerEntry) => {
    const query = encodeURIComponent(row.reference ?? "");
    if (row.type === "inward") return `/stock-inward?q=${query}`;
    if (row.type === "consumption") return `/consumption?q=${query}`;
    return `/challans?q=${query}`;
  };

  const columns = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        className: "whitespace-nowrap text-muted-foreground",
        align: "left" as const,
        render: (row: StockLedgerEntry) => formatDate(row.date ?? ""),
      },
      {
        key: "profileCode",
        header: "Profile Code",
        className: "whitespace-nowrap font-mono text-xs",
        align: "left" as const,
      },
      {
        key: "type",
        header: "Type",
        className: "whitespace-nowrap",
        align: "left" as const,
        render: (row: StockLedgerEntry) => (
          <Badge variant="outline" className="text-xs">
            {(row.type ?? "").replace("_", " ")}
          </Badge>
        ),
      },
      {
        key: "reference",
        header: "Reference",
        className: "whitespace-nowrap font-mono text-xs",
        align: "left" as const,
        render: (row: StockLedgerEntry) =>
          row.type === "scrap" ? (
            <span>{row.reference}</span>
          ) : (
            <Link
              href={getReferenceHref(row)}
              className="text-primary underline-offset-4 hover:underline"
            >
              {row.reference}
            </Link>
          ),
      },
      {
        key: "quantityIn",
        header: "In",
        className: "whitespace-nowrap tabular-nums text-emerald-600",
        align: "center" as const,
        render: (row: StockLedgerEntry) =>
          (row.quantityIn ?? 0) > 0 ? `+${row.quantityIn}` : "—",
      },
      {
        key: "quantityOut",
        header: "Out",
        className: "whitespace-nowrap tabular-nums text-red-600",
        align: "center" as const,
        render: (row: StockLedgerEntry) =>
          (row.quantityOut ?? 0) > 0 ? `-${row.quantityOut}` : "—",
      },
      {
        key: "totalWeightKg",
        header: "Total Weight (kg)",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockLedgerEntry) => formatNumber(row.totalWeightKg ?? row.weight ?? 0, 2),
      },
      {
        key: "totalWeightManualKg",
        header: "Total Weight Manual (Kg)",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockLedgerEntry) =>
          row.totalWeightManualKg != null
            ? formatNumber(row.totalWeightManualKg, 2)
            : "—",
      },
      {
        key: "length",
        header: "Length (m)",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockLedgerEntry) =>
          row.length ? formatStockLength(row.length) : "—",
      },
      {
        key: "kgPerMeter",
        header: "Kg/m",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockLedgerEntry) =>
          row.kgPerMeter ? formatNumber(row.kgPerMeter, 2) : "—",
      },
      {
        key: "totalProfiles",
        header: "NOS",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockLedgerEntry) =>
          row.totalProfiles ? formatNos(row.totalProfiles) : "—",
      },
      {
        key: "balance",
        header: "Balance (kg)",
        className: "whitespace-nowrap tabular-nums font-semibold",
        align: "center" as const,
        render: (row: StockLedgerEntry) => formatNumber(row.balance ?? 0, 1),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Stock Ledger"
        description="Complete transaction history for all profile stock movements"
      />

      <Tabs
        value={activeTypeTab}
        onValueChange={(value) => setActiveTypeTab(value as LedgerTypeFilter)}
        className="mb-3"
      >
        <div className="-mx-1 overflow-x-auto pb-1">
          <TabsList activeValue={activeTypeTab} className="h-9 w-max min-w-full sm:min-w-0">
            {LEDGER_TYPE_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <DataTable
        tableId="stock-ledger"
        data={filteredLedger}
        columns={columns}
        searchFilter={handleLedgerSearch}
        searchPlaceholder="Search by profile code, name, or reference..."
        filterContent={tableFilters}
        filtersActive={filtersActive || dateFiltersActive || typeFilterActive}
        onClearFilters={handleClearFilters}
      />
    </div>
  );
}
