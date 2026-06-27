"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useProfileCodeFilters } from "@/components/shared/profile-code-filters";
import { PowderCoatingRowActions } from "@/components/powder-coating/powder-coating-row-actions";
import { formatDate, formatNumber } from "@/lib/utils";
import { mergeProfiles } from "@/lib/profile";
import { useAppStore } from "@/lib/store";
import { useCachedOrStoreList } from "@/hooks/use-seeded-list-state";
import type { PowderCoating } from "@/types";

const selectStoreProfiles = (state: ReturnType<typeof useAppStore.getState>) =>
  state.profiles ?? [];

const AddPowderCoatingDialog = dynamic(
  () =>
    import("@/components/powder-coating/add-powder-coating-dialog").then(
      (mod) => mod.AddPowderCoatingDialog
    ),
  { ssr: false }
);

const EditPowderCoatingDialog = dynamic(
  () =>
    import("@/components/powder-coating/edit-powder-coating-dialog").then(
      (mod) => mod.EditPowderCoatingDialog
    ),
  { ssr: false }
);

export default function PowderCoatingPage() {
  const [apiProfiles, setApiProfiles] = useCachedOrStoreList(
    "/api/profiles",
    "profiles",
    selectStoreProfiles
  );
  const [editingEntry, setEditingEntry] = useState<PowderCoating | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const data = useAppStore((s) => s.powderCoating);
  const storeProfiles = useAppStore((s) => s.profiles);
  const vendors = useAppStore((s) => s.vendors);
  const addPowderCoating = useAppStore((s) => s.addPowderCoating);
  const updatePowderCoating = useAppStore((s) => s.updatePowderCoating);
  const deletePowderCoating = useAppStore((s) => s.deletePowderCoating);

  const profiles = useMemo(
    () => mergeProfiles(apiProfiles, storeProfiles ?? []),
    [apiProfiles, storeProfiles]
  );

  const profileCodes = useMemo(
    () =>
      (data ?? [])
        .map((row) => row.profileCode?.trim() ?? "")
        .filter(Boolean),
    [data]
  );

  const { filterContent, filtersActive, clearFilters, matchesCode } =
    useProfileCodeFilters(profileCodes);

  const filteredData = useMemo(
    () => (data ?? []).filter((row) => matchesCode(row.profileCode ?? "")),
    [data, matchesCode]
  );

  const handleEdit = useCallback((entry: PowderCoating) => {
    setEditingEntry(entry);
    setEditOpen(true);
  }, []);

  const handleDelete = useCallback(
    (entry: PowderCoating) => {
      if (!confirm(`Delete powder coating batch ${entry.batchNo}?`)) return;
      deletePowderCoating(entry.id);
    },
    [deletePowderCoating]
  );

  const handleUpdate = useCallback(
    (entry: PowderCoating) => {
      const { id, ...updates } = entry;
      updatePowderCoating(id, updates);
    },
    [updatePowderCoating]
  );

  const handlePowderCoatingSearch = useCallback((row: PowderCoating, query: string) => {
    const q = query.toLowerCase();
    const code = row.profileCode?.toLowerCase() ?? "";
    const name = row.profileName?.toLowerCase() ?? "";
    const batch = row.batchNo?.toLowerCase() ?? "";
    const vendor = row.vendor?.toLowerCase() ?? "";
    return (
      batch.includes(q) ||
      code.includes(q) ||
      name.includes(q) ||
      vendor.includes(q)
    );
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "batchNo",
        header: "Batch No",
        className: "whitespace-nowrap font-mono text-xs font-medium",
        align: "left" as const,
      },
      {
        key: "date",
        header: "Date",
        className: "whitespace-nowrap text-muted-foreground",
        align: "left" as const,
        render: (row: PowderCoating) => formatDate(row.date ?? ""),
      },
      {
        key: "profileCode",
        header: "Profile Code",
        className: "whitespace-nowrap font-mono text-xs",
        align: "left" as const,
        render: (row: PowderCoating) => row.profileCode || "—",
      },
      {
        key: "color",
        header: "Color",
        className: "whitespace-nowrap",
        align: "left" as const,
      },
      {
        key: "quantity",
        header: "Qty",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: PowderCoating) => formatNumber(row.quantity ?? 0),
      },
      {
        key: "vendor",
        header: "Vendor",
        className: "min-w-[140px] truncate font-medium",
        align: "left" as const,
        render: (row: PowderCoating) => (
          <span className="block truncate" title={row.vendor}>
            {row.vendor}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        className: "whitespace-nowrap",
        align: "right" as const,
        sticky: true,
        render: (row: PowderCoating) => (
          <PowderCoatingRowActions
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
        title="Powder Coating"
        description="Manage profiles sent for powder coating"
      >
        <AddPowderCoatingDialog
          profiles={profiles}
          vendors={vendors ?? []}
          onSave={addPowderCoating}
        />
      </PageHeader>
      <DataTable
        tableId="powder-coating"
        data={filteredData}
        columns={columns}
        searchFilter={handlePowderCoatingSearch}
        searchPlaceholder="Search batch, profile code, name, or vendor..."
        filterContent={filterContent}
        filtersActive={filtersActive}
        onClearFilters={clearFilters}
      />
      <EditPowderCoatingDialog
        entry={editingEntry}
        profiles={profiles}
        vendors={vendors ?? []}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingEntry(null);
        }}
        onSave={handleUpdate}
      />
    </div>
  );
}
