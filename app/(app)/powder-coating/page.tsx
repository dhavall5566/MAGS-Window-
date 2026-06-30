"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ClientPageSuspense } from "@/components/shared/client-page-suspense";
import { DataTable } from "@/components/shared/data-table";
import { useRecordDeepLink } from "@/hooks/use-record-deep-link";
import {
  combineTableFilters,
  useDateRangeFilter,
} from "@/components/shared/date-range-filter";
import { useProfileCodeFilters } from "@/components/shared/profile-code-filters";
import { PowderCoatingRowActions } from "@/components/powder-coating/powder-coating-row-actions";
import { formatDate, formatNumber } from "@/lib/utils";
import { syncListCache } from "@/lib/list-cache-sync";
import {
  createPowderCoatingApi,
  deletePowderCoatingApi,
  updatePowderCoatingApi,
} from "@/lib/powder-coating-api";
import { alertSyncFailure } from "@/lib/sync-alert";
import { mergeProfiles } from "@/lib/profile";
import { useAppStore } from "@/lib/store";
import { useCachedOrStoreList } from "@/hooks/use-seeded-list-state";
import { useModuleCrud } from "@/hooks/use-module-crud";
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
  return (
    <ClientPageSuspense>
      <PowderCoatingPageContent />
    </ClientPageSuspense>
  );
}

function PowderCoatingPageContent() {
  const { canCreate, canUpdate, canDelete } = useModuleCrud("coating");
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

  const {
    filterContent: dateFilterContent,
    filtersActive: dateFiltersActive,
    clearFilters: clearDateFilters,
    matchesDate,
  } = useDateRangeFilter();

  const filteredData = useMemo(
    () =>
      (data ?? []).filter(
        (row) => matchesCode(row.profileCode ?? "") && matchesDate(row.date)
      ),
    [data, matchesCode, matchesDate]
  );

  const handleClearAllFilters = useCallback(() => {
    clearFilters();
    clearDateFilters();
  }, [clearFilters, clearDateFilters]);

  const handleEdit = useCallback((entry: PowderCoating) => {
    setEditingEntry(entry);
    setEditOpen(true);
  }, []);

  const initialSearchQuery = useRecordDeepLink(data ?? [], handleEdit);

  const handleDelete = useCallback(
    async (entry: PowderCoating) => {
      if (!confirm(`Delete powder coating batch ${entry.batchNo}?`)) return;
      deletePowderCoating(entry.id);
      syncListCache(
        "/api/powder-coating",
        "powderCoating",
        useAppStore.getState().powderCoating ?? []
      );
      const ok = await deletePowderCoatingApi(entry.id);
      if (!ok) {
        addPowderCoating(entry);
        syncListCache(
          "/api/powder-coating",
          "powderCoating",
          useAppStore.getState().powderCoating ?? []
        );
        alert("Could not delete powder coating entry. Please check that the backend is running.");
      }
    },
    [addPowderCoating, deletePowderCoating]
  );

  const handleAdd = useCallback(
    async (entry: PowderCoating) => {
      addPowderCoating(entry);
      syncListCache(
        "/api/powder-coating",
        "powderCoating",
        useAppStore.getState().powderCoating ?? []
      );
      const saved = await createPowderCoatingApi(entry);
      if (!saved) {
        deletePowderCoating(entry.id);
        syncListCache(
          "/api/powder-coating",
          "powderCoating",
          useAppStore.getState().powderCoating ?? []
        );
        alertSyncFailure("Could not save powder coating entry to the server.");
        return;
      }
      updatePowderCoating(saved.id, saved);
      syncListCache(
        "/api/powder-coating",
        "powderCoating",
        useAppStore.getState().powderCoating ?? []
      );
    },
    [addPowderCoating, deletePowderCoating, updatePowderCoating]
  );

  const handleUpdate = useCallback(
    async (entry: PowderCoating) => {
      const previous = (useAppStore.getState().powderCoating ?? []).find(
        (item) => item.id === entry.id
      );
      const { id, ...updates } = entry;
      updatePowderCoating(id, updates);
      syncListCache(
        "/api/powder-coating",
        "powderCoating",
        useAppStore.getState().powderCoating ?? []
      );
      const saved = await updatePowderCoatingApi(id, updates);
      if (!saved) {
        if (previous) {
          updatePowderCoating(id, previous);
        }
        syncListCache(
          "/api/powder-coating",
          "powderCoating",
          useAppStore.getState().powderCoating ?? []
        );
        alertSyncFailure("Could not update powder coating entry on the server.");
        return;
      }
      updatePowderCoating(saved.id, saved);
      syncListCache(
        "/api/powder-coating",
        "powderCoating",
        useAppStore.getState().powderCoating ?? []
      );
      setEditOpen(false);
      setEditingEntry(null);
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
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        ),
      },
    ],
    [canDelete, canUpdate, handleEdit, handleDelete]
  );

  return (
    <div>
      <PageHeader
        title="Powder Coating"
        description="Manage profiles sent for powder coating"
      >
        {canCreate ? (
          <AddPowderCoatingDialog
            profiles={profiles}
            vendors={vendors ?? []}
            onSave={handleAdd}
          />
        ) : null}
      </PageHeader>
      <DataTable
        tableId="powder-coating"
        data={filteredData}
        columns={columns}
        initialSearchQuery={initialSearchQuery}
        searchFilter={handlePowderCoatingSearch}
        searchPlaceholder="Search batch, profile code, name, or vendor..."
        filterContent={combineTableFilters(filterContent, dateFilterContent)}
        filtersActive={filtersActive || dateFiltersActive}
        onClearFilters={handleClearAllFilters}
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
