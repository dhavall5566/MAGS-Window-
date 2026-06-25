"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useProfileCodeFilters } from "@/components/shared/profile-code-filters";
import { Badge } from "@/components/ui/badge";
import { mergeManualConsumption } from "@/lib/challan-consumption";
import { buildStockLedgerRows, mergeStockInward } from "@/lib/stock-master";
import { formatDate, formatNumber } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-json";
import { useAppStore } from "@/lib/store";
import type { Consumption, StockInward, StockLedgerEntry } from "@/types";

export default function StockLedgerPage() {
  const storeInward = useAppStore((s) => s.stockInward);
  const deletedStockInwardIds = useAppStore((s) => s.deletedStockInwardIds);
  const storeConsumption = useAppStore((s) => s.consumption);
  const [inward, setInward] = useState<StockInward[]>([]);
  const [consumption, setConsumption] = useState<Consumption[]>([]);

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

  const ledger = useMemo(
    () => buildStockLedgerRows(inward, consumption),
    [inward, consumption]
  );

  const profileCodes = useMemo(
    () => ledger.map((row) => row.profileCode).filter(Boolean),
    [ledger]
  );

  const { filterContent, filtersActive, clearFilters, matchesCode } =
    useProfileCodeFilters(profileCodes);

  const filteredLedger = useMemo(
    () => ledger.filter((row) => matchesCode(row.profileCode)),
    [ledger, matchesCode]
  );

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
        key: "length",
        header: "Length (m)",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockLedgerEntry) =>
          row.length ? formatNumber(row.length, 4) : "—",
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
          row.totalProfiles ? formatNumber(row.totalProfiles, 2) : "—",
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
      <DataTable
        tableId="stock-ledger"
        data={filteredLedger}
        columns={columns}
        searchFilter={handleLedgerSearch}
        searchPlaceholder="Search by profile code, name, or reference..."
        filterContent={filterContent}
        filtersActive={filtersActive}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
