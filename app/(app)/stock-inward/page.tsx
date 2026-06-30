"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ClientPageSuspense } from "@/components/shared/client-page-suspense";
import { DataTable } from "@/components/shared/data-table";
import { useRecordDeepLink } from "@/hooks/use-record-deep-link";
import {
  combineTableFilters,
  useDateRangeFilter,
} from "@/components/shared/date-range-filter";
import { useProfileCodeFilters } from "@/components/shared/profile-code-filters";
import { StockInwardRowActions } from "@/components/stock-inward/stock-inward-row-actions";
import { Badge } from "@/components/ui/badge";
import {
  formatStockLength,
  getStockInwardProfileImage,
  normalizeStockInwardRecord,
} from "@/lib/stock-inward-calculations";
import {
  createStockInwardApi,
  deleteStockInwardApi,
  saveStockInwardEntriesApi,
  splitStockInwardApi,
  updateStockInwardApi,
} from "@/lib/stock-inward-api";
import { syncStockInwardFromStore } from "@/lib/list-cache-sync";
import { formatDate, formatNumber } from "@/lib/utils";
import { useActiveStockInward } from "@/hooks/use-stock-derived-data";
import { useModuleCrud } from "@/hooks/use-module-crud";
import { showAddedToast, showDeletedToast, showSavedToast } from "@/lib/toast";
import { alertSyncFailure } from "@/lib/sync-alert";
import { notifyStockInwardSaved } from "@/lib/notifications/event-notifications";
import { useAppStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import type { StockInward } from "@/types";

const AddStockInwardDialog = dynamic(
  () =>
    import("@/components/stock-inward/add-stock-inward-dialog").then(
      (mod) => mod.AddStockInwardDialog
    ),
  { ssr: false }
);

const EditStockInwardDialog = dynamic(
  () =>
    import("@/components/stock-inward/edit-stock-inward-dialog").then(
      (mod) => mod.EditStockInwardDialog
    ),
  { ssr: false }
);

const SplitStockInwardDialog = dynamic(
  () =>
    import("@/components/stock-inward/split-stock-inward-dialog").then(
      (mod) => mod.SplitStockInwardDialog
    ),
  { ssr: false }
);

export default function StockInwardPage() {
  return (
    <ClientPageSuspense>
      <StockInwardPageContent />
    </ClientPageSuspense>
  );
}

function StockInwardPageContent() {
  const searchParams = useSearchParams();
  const linkedRecordId = searchParams.get("record");
  const linkedSearchQuery = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const { canCreate, canUpdate, canDelete } = useModuleCrud("stock");
  const addStockInward = useAppStore((s) => s.addStockInward);
  const upsertStockInward = useAppStore((s) => s.upsertStockInward);
  const revertStockInwardAdds = useAppStore((s) => s.revertStockInwardAdds);
  const deleteStockInward = useAppStore((s) => s.deleteStockInward);
  const { storeProfiles, vendors } = useAppStore(
    useShallow((s) => ({
      storeProfiles: s.profiles ?? [],
      vendors: s.vendors ?? [],
    }))
  );
  const inward = useActiveStockInward();
  const [editingEntry, setEditingEntry] = useState<StockInward | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [splittingEntry, setSplittingEntry] = useState<StockInward | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const profiles = storeProfiles;

  const profileByCode = useMemo(
    () => new Map(profiles.map((profile) => [profile.code, profile])),
    [profiles]
  );

  const profileCodes = useMemo(
    () => inward.map((row) => row.profileCode).filter(Boolean),
    [inward]
  );

  const { filterContent, filtersActive, clearFilters, matchesCode } =
    useProfileCodeFilters(profileCodes);

  const {
    filterContent: dateFilterContent,
    filtersActive: dateFiltersActive,
    clearFilters: clearDateFilters,
    matchesDate,
  } = useDateRangeFilter();

  const filteredInward = useMemo(
    () =>
      inward.filter((row) => {
        const isLinkedRecord =
          row.id === linkedRecordId ||
          (linkedSearchQuery.length > 0 &&
            row.inwardNo?.trim().toLowerCase().includes(linkedSearchQuery));

        if (isLinkedRecord) return true;

        return (
          row.status !== "split" &&
          matchesCode(row.profileCode) &&
          matchesDate(row.date)
        );
      }),
    [inward, linkedRecordId, linkedSearchQuery, matchesCode, matchesDate]
  );

  const handleClearAllFilters = useCallback(() => {
    clearFilters();
    clearDateFilters();
  }, [clearFilters, clearDateFilters]);

  const handleAddStock = useCallback(
    async (entries: StockInward[]) => {
      const normalized = entries.map(normalizeStockInwardRecord);
      const entryIds = normalized.map((entry) => entry.id);

      normalized.forEach((entry) => addStockInward(entry));
      syncStockInwardFromStore();

      const saved = await saveStockInwardEntriesApi(normalized);
      if (!saved) {
        revertStockInwardAdds(entryIds);
        syncStockInwardFromStore();
        alert("Could not save stock inward. Please check that the backend is running.");
        throw new Error("stock inward save failed");
      }

      saved.forEach((entry) => upsertStockInward(entry));
      syncStockInwardFromStore();

      showAddedToast(
        saved.length > 1 ? `${saved.length} stock inward entries` : "Stock inward"
      );
      notifyStockInwardSaved(saved.length);
    },
    [addStockInward, upsertStockInward, revertStockInwardAdds]
  );

  const handleSplit = useCallback(
    async (result: { updatedParent: StockInward; children: StockInward[] }) => {
      const pieces = result.children.map((child) => ({
        lengthInMeter: child.length,
      }));

      let saved = await splitStockInwardApi(result.updatedParent.id, pieces);

      if (!saved) {
        const savedParent = await updateStockInwardApi(result.updatedParent);
        if (!savedParent) {
          alert("Could not split stock inward. Please check that the backend is running.");
          return;
        }

        const savedChildren: StockInward[] = [];
        for (const child of result.children) {
          const savedChild = await createStockInwardApi(child);
          if (!savedChild) {
            alert("Could not save split pieces. Please check that the backend is running.");
            return;
          }
          savedChildren.push(savedChild);
        }

        saved = { updatedParent: savedParent, children: savedChildren };
      }

      upsertStockInward(saved.updatedParent);
      saved.children.forEach((child) => upsertStockInward(child));
      syncStockInwardFromStore();
      setSplitOpen(false);
      setSplittingEntry(null);
    },
    [upsertStockInward]
  );

  const handleOpenSplit = useCallback((row: StockInward) => {
    setSplittingEntry(row);
    setSplitOpen(true);
  }, []);

  const handleEdit = useCallback((row: StockInward) => {
    setEditingEntry(row);
    setEditOpen(true);
  }, []);

  const initialSearchQuery = useRecordDeepLink(inward, handleEdit);

  const handleUpdateStock = useCallback(
    async (entries: StockInward[]) => {
      if (entries.length === 0) return;

      const normalized = entries.map(normalizeStockInwardRecord);
      const [baseEntry, ...additionalEntries] = normalized;
      const additionalIds = additionalEntries.map((entry) => entry.id);
      const priorInward = (useAppStore.getState().stockInward ?? []).map((entry) => ({ ...entry }));

      normalized.forEach((entry) => upsertStockInward(entry));

      const savedBase = await updateStockInwardApi(baseEntry);
      if (!savedBase) {
        useAppStore.setState({ stockInward: priorInward });
        alertSyncFailure("Could not update stock inward on the server.");
        throw new Error("stock inward update failed");
      }
      upsertStockInward(savedBase);

      if (additionalEntries.length > 0) {
        const savedAdditional = await saveStockInwardEntriesApi(additionalEntries);
        if (!savedAdditional) {
          useAppStore.setState({ stockInward: priorInward });
          revertStockInwardAdds(additionalIds);
          alertSyncFailure(
            "Could not save additional stock inward entries on the server."
          );
          throw new Error("stock inward additional save failed");
        }
        savedAdditional.forEach((entry) => upsertStockInward(entry));
      }

      normalized.forEach((entry) => upsertStockInward(entry));

      syncStockInwardFromStore();
      showSavedToast(
        normalized.length > 1 ? `${normalized.length} stock inward entries` : "Stock inward"
      );
    },
    [upsertStockInward, revertStockInwardAdds]
  );

  const handleDelete = useCallback(
    async (row: StockInward) => {
      if (!confirm(`Delete stock inward ${row.inwardNo}?`)) return;
      deleteStockInward(row.id);
      if (editingEntry?.id === row.id) {
        setEditingEntry(null);
        setEditOpen(false);
      }

      const ok = await deleteStockInwardApi(row.id);
      if (!ok) {
        useAppStore.setState((state) => ({
          stockInward: [...(state.stockInward ?? []), row],
          deletedStockInwardIds: (state.deletedStockInwardIds ?? []).filter(
            (id) => id !== row.id
          ),
        }));
        alertSyncFailure("Could not delete stock inward from the server.");
        return;
      }
      showDeletedToast("Stock inward");
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
        render: (row: StockInward) => (
          <div className="flex flex-col gap-1">
            <span>{row.inwardNo}</span>
            {row.status === "split" && (
              <Badge variant="outline" className="w-fit text-[10px] font-normal">
                Split (archived)
              </Badge>
            )}
            {row.splitFromInwardNo && (
              <Badge variant="secondary" className="w-fit text-[10px] font-normal">
                Split from {row.splitFromInwardNo}
              </Badge>
            )}
          </div>
        ),
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
        header: "Die Code",
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
        key: "profileImage",
        header: "Profile Image",
        className: "whitespace-nowrap",
        align: "center" as const,
        render: (row: StockInward) => {
          const profile = profileByCode.get(row.profileCode);
          const src = getStockInwardProfileImage(row, profile);
          if (!src) return "—";
          return (
            <Image
              src={src}
              alt={row.profileName || row.profileCode}
              width={48}
              height={32}
              className="mx-auto max-h-8 w-auto rounded object-contain"
              unoptimized
            />
          );
        },
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
        key: "length",
        header: "Length (m)",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockInward) => formatStockLength(row.length),
      },
      {
        key: "kgPerMeter",
        header: "KG/MTR",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockInward) => formatNumber(row.kgPerMeter ?? 0, 3),
      },
      {
        key: "quantity",
        header: "NOS",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockInward) => formatNumber(row.quantity ?? 0, 2),
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
        key: "totalWeightManualKg",
        header: "Total Weight Manual (Kg)",
        className: "whitespace-nowrap tabular-nums",
        align: "center" as const,
        render: (row: StockInward) =>
          row.totalWeightManualKg != null
            ? formatNumber(row.totalWeightManualKg, 2)
            : "—",
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
            onSplit={handleOpenSplit}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        ),
      },
    ],
    [canDelete, canUpdate, handleEdit, handleDelete, handleOpenSplit, profileByCode]
  );

  return (
    <div>
      <PageHeader
        title="Stock Inward"
        description="Record and track incoming aluminium profile stock"
      >
        {canCreate ? (
          <AddStockInwardDialog
            profiles={profiles}
            vendors={vendors}
            existingInward={inward}
            onSave={handleAddStock}
          />
        ) : null}
      </PageHeader>
      <DataTable
        tableId="stock-inward"
        data={filteredInward}
        columns={columns}
        searchFilter={handleSearch}
        searchPlaceholder="Search inward no, invoice, die code, profile, or supplier..."
        initialSearchQuery={initialSearchQuery}
        filterContent={combineTableFilters(filterContent, dateFilterContent)}
        filtersActive={filtersActive || dateFiltersActive}
        onClearFilters={handleClearAllFilters}
      />
      <EditStockInwardDialog
        entry={editingEntry}
        profiles={profiles}
        vendors={vendors}
        existingInward={inward}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingEntry(null);
        }}
        onSave={handleUpdateStock}
      />
      <SplitStockInwardDialog
        entry={splittingEntry}
        profiles={profiles}
        existingInward={inward}
        open={splitOpen}
        onOpenChange={(next) => {
          setSplitOpen(next);
          if (!next) setSplittingEntry(null);
        }}
        onSave={handleSplit}
      />
    </div>
  );
}
