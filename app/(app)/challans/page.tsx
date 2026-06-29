"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Eye, FileDown, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  combineTableFilters,
  useDateRangeFilter,
} from "@/components/shared/date-range-filter";
import { ProfileCodeFilters } from "@/components/shared/profile-code-filters";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { appendChallanIfMissing } from "@/lib/challan-consumption";
import { createChallanApi, deleteChallanApi, updateChallanApi } from "@/lib/challan-api";
import { syncChallansFromStore, syncChallansList } from "@/lib/list-cache-sync";
import { alertSyncFailure } from "@/lib/sync-alert";
import {
  calculatePowderCoatingItemAmount,
  findProfileByCode,
  formatCurrency,
  getPowderCoatingItemRate,
  getItemProfileCodes,
  POWDER_COATING_RMTR_RATE_LABEL,
  getUniqueCodesForSeriesFromProfileCodes,
  getUniqueSeriesFromProfileCodes,
  matchesItemsProfileCodeFilters,
} from "@/lib/profile";
import { getOutwardChallanProjectName, sumChallanItemQuantities, sumChallanItemWeights } from "@/lib/challan-outward";
import { enrichChallanVendorDetails } from "@/lib/vendor";
import { useAppStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import type { Challan, ChallanItem, PowderCoatingChallan, Profile } from "@/types";

const ChallanFormDialog = dynamic(
  () =>
    import("@/components/challans/challan-form-dialog").then((mod) => mod.ChallanFormDialog),
  { ssr: false }
);

const CHALLAN_TYPE_LABEL: Record<string, string> = {
  outward: "Outward",
  powder_coating: "Powder Coating",
};

const CHALLAN_TYPE_BADGE_CLASS: Record<string, string> = {
  outward: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  powder_coating: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

function ChallanDetail({
  challan,
  profiles,
}: {
  challan: Challan;
  profiles: Profile[];
}) {
  const isOutward = challan.type === "outward";
  const totalNoOfProfiles = isOutward ? sumChallanItemQuantities(challan.items) : 0;
  const totalWeightAllProfiles = isOutward
    ? sumChallanItemWeights(challan.items, profiles)
    : 0;
  const coatingRate =
    challan.type === "powder_coating"
      ? (challan as PowderCoatingChallan).coatingRate
      : undefined;

  const itemRows = useMemo(
    () =>
      (challan.items ?? []).map((item, index) => ({
        ...item,
        id: `${challan.id}-item-${index}`,
      })),
    [challan.id, challan.items]
  );

  const itemColumns = useMemo<Column<(ChallanItem & { id: string })>[]>(() => {
    const columns: Column<(ChallanItem & { id: string })>[] = [
      {
        key: "profileCode",
        header: "Profile Code",
        className: "font-mono text-xs",
        render: (row) => row.profileCode,
      },
      {
        key: "profileName",
        header: "Name",
        render: (row) => row.profileName,
      },
      {
        key: "length",
        header: "Length",
        align: "center",
        render: (row) => `${formatNumber(row.length, 2)}m`,
      },
    ];

    if (!isOutward) {
      columns.push({
        key: "rate",
        header: POWDER_COATING_RMTR_RATE_LABEL,
        align: "center",
        sortable: false,
        render: (row) =>
          formatNumber(
            getPowderCoatingItemRate(row, findProfileByCode(profiles, row.profileCode), coatingRate),
            3
          ),
      });
    }

    columns.push(
      {
        key: "qty",
        header: "Qty",
        align: "center",
        render: (row) => row.qty,
      },
      {
        key: "weight",
        header: isOutward ? "Total Weight" : "Weight",
        align: "center",
        render: (row) => `${formatNumber(row.weight, 2)} kg`,
      }
    );

    if (!isOutward) {
      columns.push({
        key: "amount",
        header: "Amount",
        align: "center",
        sortable: false,
        render: (row) =>
          formatCurrency(
            calculatePowderCoatingItemAmount(
              row,
              findProfileByCode(profiles, row.profileCode),
              coatingRate
            )
          ),
      });
    }

    return columns;
  }, [isOutward, profiles, coatingRate]);

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <span className="text-muted-foreground">Vendor:</span> {challan.vendorName}
        </div>
        {challan.type === "powder_coating" && challan.outwardChallanVendorName && (
          <div>
            <span className="text-muted-foreground">Powder Coating:</span>{" "}
            {challan.outwardChallanVendorName}
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Contact:</span>{" "}
          {challan.vendorContact?.trim() || "—"}
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">Address:</span>{" "}
          {challan.vendorAddress?.trim() || "—"}
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">GST No.:</span>{" "}
          {challan.vendorGstNo?.trim() || "—"}
        </div>
        <div>
          <span className="text-muted-foreground">Person:</span>{" "}
          {challan.vendorPersonName?.trim() || "—"}
        </div>
        <div>
          <span className="text-muted-foreground">Vehicle:</span> {challan.vehicleNumber}
        </div>
        <div>
          <span className="text-muted-foreground">Driver:</span> {challan.driverName}
        </div>
        {challan.type === "outward" && challan.totalBundles != null && (
          <div>
            <span className="text-muted-foreground">Total Bundles:</span> {challan.totalBundles}
          </div>
        )}
        {challan.type === "outward" && challan.totalWeightManual != null && (
          <div>
            <span className="text-muted-foreground">Total Weight Manual:</span>{" "}
            {formatNumber(challan.totalWeightManual, 2)} kg
          </div>
        )}
        {isOutward && totalWeightAllProfiles > 0 && (
          <div>
            <span className="text-muted-foreground">Total Weight of All Profiles:</span>{" "}
            {formatNumber(totalWeightAllProfiles, 2)} kg
          </div>
        )}
        {isOutward && totalNoOfProfiles > 0 && (
          <div>
            <span className="text-muted-foreground">Total No. Of Profiles:</span>{" "}
            {totalNoOfProfiles}
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Date:</span> {formatDate(challan.date)}
        </div>
        {challan.type === "powder_coating" && (
          <>
            {challan.sourceOutwardChallanNumber && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Outward Challan:</span>{" "}
                {challan.sourceOutwardChallanNumber}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Color:</span> {challan.color}
            </div>
          </>
        )}
      </div>
      <DataTable
        tableId={`challan-items-${challan.type}`}
        data={itemRows}
        columns={itemColumns}
        density="compact"
        showResultCount={false}
        pagination={itemRows.length > 10}
        defaultPageSize={10}
      />
      {challan.type === "outward" && getOutwardChallanProjectName(challan) && (
        <p className="text-muted-foreground">
          <span className="font-medium">Project Name:</span>{" "}
          {getOutwardChallanProjectName(challan)}
        </p>
      )}
      {challan.type === "powder_coating" && getOutwardChallanProjectName(challan) && (
        <p className="text-muted-foreground">
          <span className="font-medium">Project Name:</span>{" "}
          {getOutwardChallanProjectName(challan)}
        </p>
      )}
    </div>
  );
}

export default function ChallansPage() {
  const replaceChallan = useAppStore((s) => s.replaceChallan);
  const deleteChallan = useAppStore((s) => s.deleteChallan);
  const { challans, profiles, vendors } = useAppStore(
    useShallow((s) => ({
      challans: s.challans ?? [],
      profiles: s.profiles ?? [],
      vendors: s.vendors ?? [],
    }))
  );
  const [activeTab, setActiveTab] = useState("all");
  const [seriesFilter, setSeriesFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const {
    filterContent: dateFilterContent,
    filtersActive: dateFiltersActive,
    clearFilters: clearDateFilters,
    matchesDate,
  } = useDateRangeFilter();
  const [editingChallan, setEditingChallan] = useState<Challan | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [viewChallan, setViewChallan] = useState<Challan | null>(null);
  const [, startTabTransition] = useTransition();

  const handleCreate = useCallback((challan: Challan) => {
    const currentChallans = useAppStore.getState().challans ?? [];
    replaceChallan(challan);
    syncChallansList(appendChallanIfMissing(currentChallans, challan));

    void createChallanApi(challan).then((saved) => {
      if (!saved) {
        useAppStore.setState((state) => ({
          challans: (state.challans ?? []).filter((row) => row.id !== challan.id),
        }));
        syncChallansFromStore();
        alertSyncFailure("Could not save challan to the server.");
        return;
      }
      replaceChallan(saved);
      syncChallansFromStore();
    });
  }, [replaceChallan]);

  const handleUpdate = useCallback((challan: Challan) => {
    const currentChallans = useAppStore.getState().challans ?? [];
    const previous = currentChallans.find((row) => row.id === challan.id) ?? null;
    replaceChallan(challan);
    syncChallansList(appendChallanIfMissing(currentChallans, challan));

    void updateChallanApi(challan).then((saved) => {
      if (!saved) {
        const reverted = previous
          ? currentChallans.map((row) => (row.id === previous.id ? previous : row))
          : currentChallans.filter((row) => row.id !== challan.id);
        syncChallansList(reverted);
        alertSyncFailure("Could not update challan on the server.");
        return;
      }
      replaceChallan(saved);
      syncChallansFromStore();
    });
  }, [replaceChallan]);

  const handleDelete = useCallback(async (challan: Challan) => {
    if (!confirm(`Delete challan ${challan.challanNumber}? Consumption will be updated.`)) {
      return;
    }
    const previous = challan;
    const currentChallans = useAppStore.getState().challans ?? [];
    deleteChallan(challan.id);
    const nextChallans = currentChallans.filter((row) => row.id !== challan.id);
    syncChallansList(nextChallans);
    const ok = await deleteChallanApi(challan.id);
    if (!ok) {
      const restored = appendChallanIfMissing(nextChallans, previous);
      replaceChallan(previous);
      syncChallansFromStore();
      alertSyncFailure("Could not delete challan from the server.");
    }
  }, [deleteChallan, replaceChallan]);

  const handleEdit = useCallback((challan: Challan) => {
    setEditingChallan(challan);
    setEditOpen(true);
  }, []);

  const handleView = useCallback((challan: Challan) => {
    setViewChallan(challan);
  }, []);

  const tabFiltered = useMemo(
    () =>
      (challans ?? []).filter((c) => {
        if (activeTab === "all") return true;
        return c.type === activeTab;
      }),
    [challans, activeTab]
  );

  const profileCodes = useMemo(
    () => tabFiltered.flatMap((challan) => getItemProfileCodes(challan.items)),
    [tabFiltered]
  );

  const seriesFilterOptions = useMemo(
    () => getUniqueSeriesFromProfileCodes(profileCodes),
    [profileCodes]
  );

  const codeFilterOptions = useMemo(
    () =>
      seriesFilter
        ? getUniqueCodesForSeriesFromProfileCodes(profileCodes, seriesFilter)
        : [],
    [profileCodes, seriesFilter]
  );

  const filtered = useMemo(
    () =>
      tabFiltered.filter(
        (challan) =>
          matchesItemsProfileCodeFilters(challan.items, seriesFilter, codeFilter) &&
          matchesDate(challan.date)
      ),
    [tabFiltered, seriesFilter, codeFilter, matchesDate]
  );

  const handleChallanSearch = useCallback((row: Challan, query: string) => {
    const q = query.toLowerCase();
    const codes = getItemProfileCodes(row.items).join(" ").toLowerCase();
    const names = (row.items ?? []).map((item) => item.profileName).join(" ").toLowerCase();
    return (
      row.challanNumber?.toLowerCase().includes(q) ||
      row.vendorName?.toLowerCase().includes(q) ||
      codes.includes(q) ||
      names.includes(q)
    );
  }, []);

  const tableFilters = combineTableFilters(
    <ProfileCodeFilters
      seriesFilter={seriesFilter}
      codeFilter={codeFilter}
      seriesOptions={seriesFilterOptions}
      codeOptions={codeFilterOptions}
      onSeriesChange={setSeriesFilter}
      onCodeChange={setCodeFilter}
    />,
    dateFilterContent
  );

  const handleClearFilters = useCallback(() => {
    setSeriesFilter("");
    setCodeFilter("");
    clearDateFilters();
  }, [clearDateFilters]);

  const formatProfileCodes = (items: Challan["items"]) => {
    const codes = getItemProfileCodes(items);
    if (codes.length === 0) return { label: "—", title: "" };
    if (codes.length <= 2) {
      return { label: codes.join(", "), title: codes.join(", ") };
    }
    return {
      label: `${codes.slice(0, 2).join(", ")} +${codes.length - 2}`,
      title: codes.join(", "),
    };
  };

  const columns = useMemo(
    () => [
    {
      key: "challanNumber",
      header: "Challan No",
      className: "whitespace-nowrap font-mono text-xs font-medium",
      align: "left" as const,
    },
    {
      key: "type",
      header: "Type",
      className: "whitespace-nowrap",
      align: "left" as const,
      render: (row: Challan) => (
        <Badge
          variant="outline"
          className={cn(
            "whitespace-nowrap border px-2.5 py-0.5 text-xs font-medium",
              CHALLAN_TYPE_BADGE_CLASS[row.type]
            )}
          >
            {CHALLAN_TYPE_LABEL[row.type] ?? row.type}
        </Badge>
      ),
    },
    {
      key: "date",
      header: "Date",
      className: "whitespace-nowrap text-muted-foreground",
      align: "left" as const,
      render: (row: Challan) => formatDate(row.date ?? ""),
    },
    {
      key: "vendorName",
      header: "Vendor",
      className: "min-w-[180px] max-w-[260px] truncate font-medium",
      align: "left" as const,
      render: (row: Challan) => (
        <span className="block truncate" title={row.vendorName}>
          {row.vendorName}
        </span>
      ),
    },
    {
      key: "profileCode",
      header: "Profile Code",
      className: "min-w-[160px] max-w-[240px] truncate",
      align: "left" as const,
      sortValue: (row: Challan) => getItemProfileCodes(row.items).join(", "),
      render: (row: Challan) => {
        const { label, title } = formatProfileCodes(row.items);
        return (
          <span
            className="block truncate rounded-md bg-muted/50 px-2 py-1 font-mono text-xs"
            title={title || undefined}
          >
            {label}
          </span>
        );
      },
    },
    {
      key: "items",
      header: "Items",
      className: "whitespace-nowrap tabular-nums",
      align: "center" as const,
      render: (row: Challan) => formatNumber((row.items ?? []).length),
    },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap",
      align: "right" as const,
      sticky: true,
        render: (row: Challan) => (
          <TableRowActions>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="View challan"
              onClick={() => handleView(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Edit challan"
              onClick={() => handleEdit(row)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              aria-label="Delete challan"
              onClick={() => void handleDelete(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Download PDF"
              onClick={async () => {
                try {
                  const { generateChallanPDF } = await import("@/lib/challan-pdf");
                  await generateChallanPDF(
                    enrichChallanVendorDetails(row, vendors ?? []),
                    profiles,
                    vendors ?? []
                  );
                } catch (error) {
                  console.error("PDF download failed:", error);
                  alert("Could not generate the PDF. Please refresh the page and try again.");
                }
              }}
            >
              <FileDown className="h-4 w-4" />
            </Button>
          </TableRowActions>
        ),
      },
    ],
    [handleDelete, handleEdit, handleView, profiles, vendors]
  );

  return (
    <div>
      <PageHeader
        title="Challan Management"
        description="Outward delivery and powder coating challans — consumption syncs automatically"
      >
        <ChallanFormDialog
          type="outward"
          profiles={profiles}
          vendors={vendors ?? []}
          onSave={handleCreate}
        />
        <ChallanFormDialog
          type="powder_coating"
          profiles={profiles}
          vendors={vendors ?? []}
          onSave={handleCreate}
        />
      </PageHeader>

      {editingChallan &&
        (editingChallan.type === "outward" || editingChallan.type === "powder_coating") && (
        <ChallanFormDialog
          type={editingChallan.type}
          profiles={profiles}
          vendors={vendors ?? []}
          challanToEdit={editingChallan}
          open={editOpen}
          onOpenChange={(next) => {
            setEditOpen(next);
            if (!next) setEditingChallan(null);
          }}
          showTrigger={false}
          onSave={handleUpdate}
        />
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          startTabTransition(() => {
            setActiveTab(value);
            setSeriesFilter("");
            setCodeFilter("");
            clearDateFilters();
          });
        }}
        className="mb-3"
      >
        <div className="-mx-1 overflow-x-auto pb-1">
          <TabsList activeValue={activeTab} className="h-9 w-max min-w-full sm:min-w-0">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              All Challans
            </TabsTrigger>
            <TabsTrigger value="outward" className="text-xs sm:text-sm">
              Outward
            </TabsTrigger>
            <TabsTrigger value="powder_coating" className="text-xs sm:text-sm">
              Powder Coating
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="mt-3">
          <DataTable
            tableId="challans"
            data={filtered}
            columns={columns}
            searchFilter={handleChallanSearch}
            searchPlaceholder="Search challan, vendor, or profile code..."
            filterContent={tableFilters}
            filtersActive={Boolean(seriesFilter || codeFilter || dateFiltersActive)}
            onClearFilters={handleClearFilters}
          />
        </div>
      </Tabs>

      <Dialog
        open={viewChallan !== null}
        onOpenChange={(open) => {
          if (!open) setViewChallan(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          {viewChallan ? (
            <>
              <DialogHeader>
                <DialogTitle>{viewChallan.challanNumber}</DialogTitle>
              </DialogHeader>
              <ChallanDetail challan={viewChallan} profiles={profiles} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="mt-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Consumption Sync</p>
        <p className="mt-1 text-xs leading-relaxed">
          Creating, editing, or deleting a challan updates <strong>Consumption</strong> and{" "}
          <strong>Stock Master</strong>. Outward challans drive consumption; powder coating
          challans track coating dispatch.
        </p>
      </div>
    </div>
  );
}
