"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { Eye, FileDown, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useDateRangeFilter } from "@/components/shared/date-range-filter";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatGstNo, formatNumber } from "@/lib/utils";
import { getCachedJson } from "@/lib/fetch-json";
import { useCachedApiList } from "@/hooks/use-cached-api-list";
import { syncListCache } from "@/lib/list-cache-sync";
import { mergeProfiles } from "@/lib/profile";
import { getPurchaseOrderTotalWeight, resolvePurchaseOrderItemWeight } from "@/lib/purchase-order-form";
import { showDeletedToast } from "@/lib/toast";
import { alertSyncFailure } from "@/lib/sync-alert";
import {
  createPurchaseOrderApi,
  deletePurchaseOrderApi,
  mergePurchaseOrders,
  updatePurchaseOrderApi,
} from "@/lib/purchase-order-api";
import { useAppStore } from "@/lib/store";
import type { Profile, PurchaseOrder } from "@/types";

const PurchaseOrderFormDialog = dynamic(
  () =>
    import("@/components/purchase-orders/purchase-order-form-dialog").then(
      (mod) => mod.PurchaseOrderFormDialog
    ),
  { ssr: false }
);

function PurchaseOrderDetail({ order }: { order: PurchaseOrder }) {
  const itemRows = useMemo(
    () =>
      (order.items ?? []).map((item, index) => ({
        ...item,
        id: `${order.id}-item-${index}`,
      })),
    [order.id, order.items]
  );

  const columns = useMemo<Column<(typeof itemRows)[number]>[]>(
    () => [
      {
        key: "dyeCode",
        header: "Dye Code",
        className: "font-mono text-xs",
        render: (row) => row.dyeCode?.trim() || "—",
      },
      {
        key: "profileCode",
        header: "Profile",
        className: "font-mono text-xs",
        render: (row) => row.profileCode || "—",
      },
      { key: "profileName", header: "Profile Name", render: (row) => row.profileName || "—" },
      {
        key: "kgPerMeter",
        header: "KG/MTR",
        align: "center",
        render: (row) => (row.kgPerMeter ? formatNumber(row.kgPerMeter, 3) : "—"),
      },
      {
        key: "length",
        header: "Length (MM)",
        align: "center",
        render: (row) => (row.length ? formatNumber(row.length, 1) : "—"),
      },
      {
        key: "qty",
        header: "Qty",
        align: "center",
        render: (row) => (row.qty ? formatNumber(row.qty) : "—"),
      },
      {
        key: "totalWeightKg",
        header: "Total Weight",
        align: "center",
        render: (row) => `${formatNumber(resolvePurchaseOrderItemWeight(row), 2)} KG`,
      },
    ],
    []
  );

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <span className="text-muted-foreground">PO / D.C. No:</span> {order.poNumber}
        </div>
        <div>
          <span className="text-muted-foreground">Date:</span> {formatDate(order.date)}
        </div>
        <div className="sm:col-span-2">
          <span className="text-muted-foreground">Party:</span> {order.vendorName}
        </div>
        {order.vendorAddress && (
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Address:</span> {order.vendorAddress}
          </div>
        )}
        {order.gstNo && (
          <div>
            <span className="text-muted-foreground">GST No.:</span> {formatGstNo(order.gstNo)}
          </div>
        )}
        {order.personName && (
          <div>
            <span className="text-muted-foreground">Person Name:</span> {order.personName}
          </div>
        )}
        {order.contactNo && (
          <div>
            <span className="text-muted-foreground">Contact No.:</span> {order.contactNo}
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Total Weight:</span>{" "}
          {formatNumber(getPurchaseOrderTotalWeight(order), 2)} KG
        </div>
      </div>
      <DataTable
        tableId="purchase-order-items"
        data={itemRows}
        columns={columns}
        density="compact"
        showResultCount={false}
        pagination={itemRows.length > 10}
        defaultPageSize={10}
      />
      {order.remarks && (
        <p className="text-muted-foreground">
          <span className="font-medium">Remarks:</span> {order.remarks}
        </p>
      )}
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const storeProfiles = useAppStore((s) => s.profiles);
  const storeOrders = useAppStore((s) => s.purchaseOrders);
  const vendors = useAppStore((s) => s.vendors);
  const addPurchaseOrder = useAppStore((s) => s.addPurchaseOrder);
  const replacePurchaseOrder = useAppStore((s) => s.replacePurchaseOrder);
  const deletePurchaseOrder = useAppStore((s) => s.deletePurchaseOrder);

  const { apiItems: apiProfiles } = useCachedApiList<Profile, "profiles">(
    "/api/profiles",
    "profiles",
    {
      hasSeedData: () => (useAppStore.getState().profiles ?? []).length > 0,
      getStoreFallback: () => useAppStore.getState().profiles ?? [],
    }
  );
  const { apiItems: apiOrders, isLoading, setApiItems: setApiOrders } = useCachedApiList<
    PurchaseOrder,
    "purchaseOrders"
  >("/api/purchase-orders", "purchaseOrders", {
    hasSeedData: () => (useAppStore.getState().purchaseOrders ?? []).length > 0,
    getStoreFallback: () => useAppStore.getState().purchaseOrders ?? [],
  });
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);

  const profiles = useMemo(
    () => mergeProfiles(apiProfiles, storeProfiles ?? []),
    [apiProfiles, storeProfiles]
  );

  const orders = useMemo(
    () => mergePurchaseOrders(apiOrders, storeOrders ?? []),
    [apiOrders, storeOrders]
  );

  const {
    filterContent: dateFilterContent,
    filtersActive: dateFiltersActive,
    clearFilters: clearDateFilters,
    matchesDate,
  } = useDateRangeFilter();

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesDate(order.date)),
    [orders, matchesDate]
  );

  const showLoading = isLoading && orders.length === 0;

  const handleCreate = useCallback(
    async (order: PurchaseOrder) => {
      addPurchaseOrder(order);
      const nextOrders = useAppStore.getState().purchaseOrders ?? [];
      syncListCache("/api/purchase-orders", "purchaseOrders", nextOrders);
      setApiOrders(mergePurchaseOrders(apiOrders, nextOrders));

      const saved = await createPurchaseOrderApi(order);
      if (!saved) {
        deletePurchaseOrder(order.id);
        const restored = useAppStore.getState().purchaseOrders ?? [];
        syncListCache("/api/purchase-orders", "purchaseOrders", restored);
        setApiOrders(mergePurchaseOrders(apiOrders, restored));
        alert("Could not save purchase order. Please check that the backend is running.");
        return;
      }
      replacePurchaseOrder(saved);
      const merged = useAppStore.getState().purchaseOrders ?? [];
      syncListCache("/api/purchase-orders", "purchaseOrders", merged);
      setApiOrders(mergePurchaseOrders(apiOrders, merged));
    },
    [addPurchaseOrder, replacePurchaseOrder, deletePurchaseOrder, apiOrders, setApiOrders]
  );

  const handleUpdate = useCallback(
    async (order: PurchaseOrder) => {
      const previous = (useAppStore.getState().purchaseOrders ?? []).find(
        (entry) => entry.id === order.id
      );
      replacePurchaseOrder(order);
      const nextOrders = useAppStore.getState().purchaseOrders ?? [];
      syncListCache("/api/purchase-orders", "purchaseOrders", nextOrders);
      setApiOrders(mergePurchaseOrders(apiOrders, nextOrders));

      const saved = await updatePurchaseOrderApi(order);
      if (!saved) {
        if (previous) {
          replacePurchaseOrder(previous);
        }
        const restored = useAppStore.getState().purchaseOrders ?? [];
        syncListCache("/api/purchase-orders", "purchaseOrders", restored);
        setApiOrders(mergePurchaseOrders(apiOrders, restored));
        alertSyncFailure("Could not update purchase order on the server.");
        return;
      }
      replacePurchaseOrder(saved);
      const merged = useAppStore.getState().purchaseOrders ?? [];
      syncListCache("/api/purchase-orders", "purchaseOrders", merged);
      setApiOrders(mergePurchaseOrders(apiOrders, merged));
      setEditOpen(false);
      setEditingOrder(null);
    },
    [replacePurchaseOrder, apiOrders, setApiOrders]
  );

  const handleDelete = useCallback(
    async (order: PurchaseOrder) => {
      if (!confirm(`Delete purchase order ${order.poNumber}?`)) return;
      showDeletedToast("Purchase order");
      deletePurchaseOrder(order.id);
      const nextOrders = useAppStore.getState().purchaseOrders ?? [];
      syncListCache("/api/purchase-orders", "purchaseOrders", nextOrders);
      setApiOrders(mergePurchaseOrders(apiOrders, nextOrders));

      const ok = await deletePurchaseOrderApi(order.id);
      if (!ok) {
        addPurchaseOrder(order);
        const restored = useAppStore.getState().purchaseOrders ?? [];
        syncListCache("/api/purchase-orders", "purchaseOrders", restored);
        setApiOrders(mergePurchaseOrders(apiOrders, restored));
        alert("Could not delete purchase order. Please check that the backend is running.");
      }
    },
    [deletePurchaseOrder, addPurchaseOrder, apiOrders, setApiOrders]
  );

  const handleDownload = useCallback(
    async (order: PurchaseOrder) => {
      try {
        const { generatePurchaseOrderPDF } = await import("@/lib/purchase-order-pdf");
        await generatePurchaseOrderPDF(order, profiles);
      } catch (error) {
        console.error("PO PDF download failed:", error);
        alert("Could not generate the PDF. Please refresh the page and try again.");
      }
    },
    [profiles]
  );

  const handleView = useCallback((order: PurchaseOrder) => {
    setViewOrder(order);
  }, []);

  const handleEdit = useCallback((order: PurchaseOrder) => {
    setEditingOrder(order);
    setEditOpen(true);
  }, []);

  const handleSearch = useCallback((row: PurchaseOrder, query: string) => {
    const q = query.toLowerCase();
    const codes = (row.items ?? []).map((i) => i.profileCode).join(" ").toLowerCase();
    return (
      row.poNumber?.toLowerCase().includes(q) ||
      row.vendorName?.toLowerCase().includes(q) ||
      row.gstNo?.toLowerCase().includes(q) ||
      row.personName?.toLowerCase().includes(q) ||
      row.contactNo?.toLowerCase().includes(q) ||
      codes.includes(q)
    );
  }, []);

  const columns = useMemo<Column<PurchaseOrder>[]>(
    () => [
      {
        key: "poNumber",
        header: "PO / D.C. No",
        className: "whitespace-nowrap font-mono text-xs font-medium",
        align: "left",
      },
      {
        key: "date",
        header: "Date",
        className: "whitespace-nowrap text-muted-foreground",
        align: "left",
        render: (row) => formatDate(row.date ?? ""),
      },
      {
        key: "vendorName",
        header: "Party",
        className: "min-w-[160px] max-w-[220px] truncate font-medium",
        align: "left",
        render: (row) => (
          <span className="block truncate" title={row.vendorName}>
            {row.vendorName}
          </span>
        ),
      },
      {
        key: "personName",
        header: "Person Name",
        className: "min-w-[120px] max-w-[180px] truncate",
        align: "left",
        hideBelow: "lg",
        render: (row) => row.personName || "\u2014",
      },
      {
        key: "contactNo",
        header: "Contact No.",
        className: "whitespace-nowrap tabular-nums",
        align: "left",
        hideBelow: "md",
        render: (row) => row.contactNo || "\u2014",
      },
      {
        key: "gstNo",
        header: "GST No.",
        className: "whitespace-nowrap font-mono text-xs",
        align: "left",
        hideBelow: "lg",
        render: (row) => formatGstNo(row.gstNo) || "\u2014",
      },
      {
        key: "items",
        header: "Items",
        className: "whitespace-nowrap tabular-nums",
        align: "center",
        render: (row) => formatNumber((row.items ?? []).length),
      },
      {
        key: "totalWeight",
        header: "Total Weight",
        className: "whitespace-nowrap tabular-nums",
        align: "center",
        sortValue: (row) => getPurchaseOrderTotalWeight(row),
        render: (row) => `${formatNumber(getPurchaseOrderTotalWeight(row), 2)} KG`,
      },
      {
        key: "actions",
        header: "Actions",
        className: "whitespace-nowrap",
        align: "right",
        sticky: true,
        render: (row) => (
          <TableRowActions>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="View purchase order"
              onClick={() => handleView(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Edit purchase order"
              onClick={() => handleEdit(row)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              aria-label="Delete purchase order"
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
              onClick={() => void handleDownload(row)}
            >
              <FileDown className="h-4 w-4" />
            </Button>
          </TableRowActions>
        ),
      },
    ],
    [handleDelete, handleDownload, handleEdit, handleView]
  );

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Issue purchase orders to suppliers and export them as printable PDFs"
      >
        <PurchaseOrderFormDialog
          profiles={profiles}
          vendors={vendors ?? []}
          existingOrders={orders}
          onSave={handleCreate}
        />
      </PageHeader>

      {editingOrder && (
        <PurchaseOrderFormDialog
          profiles={profiles}
          vendors={vendors ?? []}
          existingOrders={orders}
          orderToEdit={editingOrder}
          open={editOpen}
          onOpenChange={(next) => {
            setEditOpen(next);
            if (!next) setEditingOrder(null);
          }}
          showTrigger={false}
          onSave={handleUpdate}
        />
      )}

      <Dialog
        open={viewOrder !== null}
        onOpenChange={(open) => {
          if (!open) setViewOrder(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          {viewOrder ? (
            <>
              <DialogHeader>
                <DialogTitle>{viewOrder.poNumber}</DialogTitle>
              </DialogHeader>
              <PurchaseOrderDetail order={viewOrder} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <DataTable
        tableId="purchase-orders"
        data={filteredOrders}
        columns={columns}
        isLoading={showLoading}
        loadingMessage="Loading purchase orders…"
        searchFilter={handleSearch}
        searchPlaceholder="Search PO number, party, or profile code..."
        emptyMessage="No purchase orders yet. Create one to get started."
        filterContent={dateFilterContent}
        filtersActive={dateFiltersActive}
        onClearFilters={clearDateFilters}
      />
    </div>
  );
}
