"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useProfileCodeFilters } from "@/components/shared/profile-code-filters";
import { StockInwardRowActions } from "@/components/stock-inward/stock-inward-row-actions";
import { Badge } from "@/components/ui/badge";
import { mergeProfiles } from "@/lib/profile";
import {
  formatStockLength,
  getStockInwardProfileImage,
  normalizeStockInwardRecord,
} from "@/lib/stock-inward-calculations";
import {
  createStockInwardApi,
  deleteStockInwardApi,
  splitStockInwardApi,
  updateStockInwardApi,
} from "@/lib/stock-inward-api";
import { mergeStockInward } from "@/lib/stock-master";
import { formatDate, formatNumber } from "@/lib/utils";
import { useCachedOrStoreList } from "@/hooks/use-seeded-list-state";
import { showDeletedToast } from "@/lib/toast";
import { useAppStore } from "@/lib/store";
import type { Profile, StockInward } from "@/types";

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

const selectStoreInward = (state: ReturnType<typeof useAppStore.getState>) =>
  state.stockInward ?? [];
const selectStoreProfiles = (state: ReturnType<typeof useAppStore.getState>) =>
  state.profiles ?? [];

export default function StockInwardPage() {
  const storeInward = useAppStore((s) => s.stockInward);
  const deletedStockInwardIds = useAppStore((s) => s.deletedStockInwardIds);
  const addStockInward = useAppStore((s) => s.addStockInward);
  const upsertStockInward = useAppStore((s) => s.upsertStockInward);
  const deleteStockInward = useAppStore((s) => s.deleteStockInward);
  const storeProfiles = useAppStore((s) => s.profiles);
  const [apiInward, setApiInward] = useCachedOrStoreList(
    "/api/stock",
    "inward",
    selectStoreInward,
    normalizeStockInwardRecord
  );
  const [apiProfiles, setApiProfiles] = useCachedOrStoreList(
    "/api/profiles",
    "profiles",
    selectStoreProfiles
  );
  const [editingEntry, setEditingEntry] = useState<StockInward | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [splittingEntry, setSplittingEntry] = useState<StockInward | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const profiles = mergeProfiles(apiProfiles, storeProfiles ?? []);

  const profileByCode = useMemo(
    () => new Map(profiles.map((profile) => [profile.code, profile])),
    [profiles]
  );

  const inward = useMemo(
    () =>
      mergeStockInward(
        apiInward,
        (storeInward ?? []).map(normalizeStockInwardRecord),
        deletedStockInwardIds ?? []
      ),
    [apiInward, storeInward, deletedStockInwardIds]
  );

  const profileCodes = useMemo(
    () => inward.map((row) => row.profileCode).filter(Boolean),
    [inward]
  );

  const { filterContent, filtersActive, clearFilters, matchesCode } =
    useProfileCodeFilters(profileCodes);

  const filteredInward = useMemo(
    () =>
      inward.filter(
        (row) => row.status !== "split" && matchesCode(row.profileCode)
      ),
    [inward, matchesCode]
  );

  const handleAddStock = useCallback(
    async (entries: StockInward[]) => {
      entries.forEach((entry) => addStockInward(normalizeStockInwardRecord(entry)));

      const results = await Promise.all(
        entries.map(async (entry) => ({
          entry,
          saved: await createStockInwardApi(entry),
        }))
      );

      for (const { entry, saved } of results) {
        if (!saved) {
          deleteStockInward(entry.id);
          alert("Could not save stock inward. Please check that the backend is running.");
          return;
        }
        upsertStockInward(saved);
      }
    },
    [addStockInward, upsertStockInward, deleteStockInward]
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

  const handleUpdateStock = useCallback(
    async (entries: StockInward[]) => {
      if (entries.length === 0) return;

      for (let index = 0; index < entries.length; index += 1) {
        const entry = normalizeStockInwardRecord(entries[index]);
        upsertStockInward(entry);

        const saved =
          index === 0
            ? await updateStockInwardApi(entry)
            : await createStockInwardApi(entry);

        if (!saved) {
          alert(
            index === 0
              ? "Could not update stock inward. Please check that the backend is running."
              : "Could not save additional stock inward entries. Please check that the backend is running."
          );
          return;
        }
        upsertStockInward(saved);
      }

      setEditOpen(false);
      setEditingEntry(null);
    },
    [upsertStockInward]
  );

  const handleDelete = useCallback(
    async (row: StockInward) => {
      if (!confirm(`Delete stock inward ${row.inwardNo}?`)) return;
      showDeletedToast("Stock inward");
      deleteStockInward(row.id);
      if (editingEntry?.id === row.id) {
        setEditingEntry(null);
        setEditOpen(false);
      }

      const ok = await deleteStockInwardApi(row.id);
      if (!ok) {
        alert("Could not delete stock inward. Please check that the backend is running.");
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
        render: (row: StockInward) => (
          <div className="flex flex-col gap-1">
            <span>{row.inwardNo}</span>
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
          />
        ),
      },
    ],
    [handleEdit, handleDelete, handleOpenSplit, profileByCode]
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
        searchPlaceholder="Search inward no, invoice, die code, profile, or supplier..."
        filterContent={filterContent}
        filtersActive={filtersActive}
        onClearFilters={clearFilters}
      />
      <EditStockInwardDialog
        entry={editingEntry}
        profiles={profiles}
        existingInward={inward}
        open={editOpen}
        onOpenChange={setEditOpen}
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
