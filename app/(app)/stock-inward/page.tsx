"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useProfileCodeFilters } from "@/components/shared/profile-code-filters";
import { AddStockInwardDialog } from "@/components/stock-inward/add-stock-inward-dialog";
import { EditStockInwardDialog } from "@/components/stock-inward/edit-stock-inward-dialog";
import { StockInwardRowActions } from "@/components/stock-inward/stock-inward-row-actions";
import { mergeProfiles } from "@/lib/profile";
import { mergeStockInward } from "@/lib/stock-master";
import { formatDate, formatNumber } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-json";
import { useAppStore } from "@/lib/store";
import type { Profile, StockInward } from "@/types";

export default function StockInwardPage() {
  const storeInward = useAppStore((s) => s.stockInward);
  const deletedStockInwardIds = useAppStore((s) => s.deletedStockInwardIds);
  const storeProfiles = useAppStore((s) => s.profiles);
  const addStockInward = useAppStore((s) => s.addStockInward);
  const upsertStockInward = useAppStore((s) => s.upsertStockInward);
  const deleteStockInward = useAppStore((s) => s.deleteStockInward);
  const [inward, setInward] = useState<StockInward[]>([]);
  const [apiProfiles, setApiProfiles] = useState<Profile[]>([]);
  const [editingEntry, setEditingEntry] = useState<StockInward | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const profiles = mergeProfiles(apiProfiles, storeProfiles ?? []);

  useEffect(() => {
    fetchJson<{ inward?: StockInward[] }>("/api/stock").then((d) => {
      setInward(
        mergeStockInward(d?.inward ?? [], storeInward ?? [], deletedStockInwardIds ?? [])
      );
    });
  }, [storeInward, deletedStockInwardIds]);

  useEffect(() => {
    fetchJson<{ profiles?: Profile[] }>("/api/profiles").then((d) => {
      setApiProfiles(d?.profiles ?? []);
    });
  }, []);

  const profileCodes = useMemo(
    () => inward.map((row) => row.profileCode).filter(Boolean),
    [inward]
  );

  const { filterContent, filtersActive, clearFilters, matchesCode } =
    useProfileCodeFilters(profileCodes);

  const filteredInward = useMemo(
    () => inward.filter((row) => matchesCode(row.profileCode)),
    [inward, matchesCode]
  );

  const handleAddStock = (entries: StockInward[]) => {
    entries.forEach((entry) => addStockInward(entry));
    setInward((prev) => [...(prev ?? []), ...entries]);
  };

  const handleEdit = useCallback((row: StockInward) => {
    setEditingEntry(row);
    setEditOpen(true);
  }, []);

  const handleUpdateStock = (entry: StockInward) => {
    upsertStockInward(entry);
    setInward((prev) =>
      (prev ?? []).map((item) => (item.id === entry.id ? entry : item))
    );
  };

  const handleDelete = useCallback(
    (row: StockInward) => {
      if (!confirm(`Delete stock inward ${row.inwardNo}?`)) return;
      deleteStockInward(row.id);
      setInward((prev) => (prev ?? []).filter((item) => item.id !== row.id));
      if (editingEntry?.id === row.id) {
        setEditingEntry(null);
        setEditOpen(false);
      }
    },
    [deleteStockInward, editingEntry?.id]
  );

  const handleSearch = useCallback((row: StockInward, query: string) => {
    const q = query.toLowerCase();
    return (
      row.inwardNo?.toLowerCase().includes(q) ||
      row.dyeCode?.toLowerCase().includes(q) ||
      row.profileCode?.toLowerCase().includes(q) ||
      row.profileName?.toLowerCase().includes(q) ||
      row.supplier?.toLowerCase().includes(q) ||
      (row.invoiceNo?.toLowerCase().includes(q) ?? false)
    );
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "inwardNo",
        header: "Inward No",
        className: "whitespace-nowrap font-mono text-xs font-medium",
        align: "left" as const,
      },
      {
        key: "date",
        header: "Date",
        className: "whitespace-nowrap text-muted-foreground",
        align: "left" as const,
        render: (row: StockInward) => formatDate(row.date ?? ""),
      },
      {
        key: "invoiceNo",
        header: "Invoice No.",
        className: "whitespace-nowrap font-mono text-xs",
        align: "left" as const,
        render: (row: StockInward) => row.invoiceNo?.trim() || "—",
      },
      {
        key: "supplier",
        header: "Supplier",
        className: "min-w-[140px] truncate font-medium",
        align: "left" as const,
        render: (row: StockInward) => (
          <span className="block truncate" title={row.supplier}>
            {row.supplier}
          </span>
        ),
      },
      {
        key: "dyeCode",
        header: "Dye Code",
        className: "whitespace-nowrap font-mono text-xs",
        align: "left" as const,
        render: (row: StockInward) => row.dyeCode?.trim() || "—",
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
        className: "min-w-[160px] truncate",
        align: "left" as const,
        render: (row: StockInward) => (
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
        render: (row: StockInward) =>
          formatNumber(row.totalWeightKg ?? row.weight ?? 0, 2),
      },
      {
        key: "lengthFeet",
        header: "Length (ft)",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockInward) => formatNumber(row.lengthFeet ?? 0, 2),
      },
      {
        key: "length",
        header: "Length (m)",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockInward) => formatNumber(row.length ?? 0, 4),
      },
      {
        key: "kgPerMeter",
        header: "Kg/m",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockInward) => formatNumber(row.kgPerMeter ?? 0, 2),
      },
      {
        key: "rate",
        header: "Rate",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockInward) => formatNumber(row.rate ?? 0, 2),
      },
      {
        key: "quantity",
        header: "NOS",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockInward) => formatNumber(row.quantity ?? 0, 2),
      },
      {
        key: "actions",
        header: "Actions",
        className: "whitespace-nowrap",
        align: "right" as const,
        sticky: true,
        render: (row: StockInward) => (
          <StockInwardRowActions
            entry={row}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ),
      },
    ],
    [handleEdit, handleDelete]
  );

  return (
    <div>
      <PageHeader
        title="Stock Inward"
        description="Record and track incoming aluminium profile stock"
      >
        <AddStockInwardDialog
          profiles={profiles}
          existingInward={inward}
          onSave={handleAddStock}
        />
      </PageHeader>
      <DataTable
        tableId="stock-inward"
        data={filteredInward}
        columns={columns}
        searchFilter={handleSearch}
        searchPlaceholder="Search inward no, invoice, dye code, profile, or supplier..."
        filterContent={filterContent}
        filtersActive={filtersActive}
        onClearFilters={clearFilters}
      />
      <EditStockInwardDialog
        entry={editingEntry}
        profiles={profiles}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleUpdateStock}
      />
    </div>
  );
}
