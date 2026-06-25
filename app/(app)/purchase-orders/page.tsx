"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, FileDown, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate, formatNumber } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-json";
import { mergeProfiles } from "@/lib/profile";
import { getPurchaseOrderTotalWeight } from "@/lib/purchase-order-form";
import {
  createPurchaseOrderApi,
  deletePurchaseOrderApi,
  fetchPurchaseOrders,
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
        key: "profileCode",
        header: "Dia Code",
        className: "font-mono text-xs",
        render: (row) => row.profileCode || "—",
      },
      { key: "profileName", header: "Profile", render: (row) => row.profileName || "—" },
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
        render: (row) => (row.length ? formatNumber(row.length) : "—"),
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
        render: (row) => `${formatNumber(row.totalWeightKg, 2)} KG`,
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
        {order.vehicleNumber && (
          <div>
            <span className="text-muted-foreground">V. Number:</span> {order.vehicleNumber}
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
  const vendors = useAppStore((s) => s.vendors);
  const addPurchaseOrder = useAppStore((s) => s.addPurchaseOrder);
  const replacePurchaseOrder = useAppStore((s) => s.replacePurchaseOrder);
  const deletePurchaseOrder = useAppStore((s) => s.deletePurchaseOrder);

  const [apiProfiles, setApiProfiles] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const profiles = useMemo(
    () => mergeProfiles(apiProfiles, storeProfiles ?? []),
    [apiProfiles, storeProfiles]
  );

  const loadOrders = useCallback(async () => {
    const merged = await fetchPurchaseOrders(useAppStore.getState().purchaseOrders ?? []);
    setOrders(merged);
    return merged;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const storeOrders = useAppStore.getState().purchaseOrders ?? [];

    Promise.all([
      fetchJson<{ profiles?: Profile[] }>("/api/profiles"),
      fetchPurchaseOrders(storeOrders),
    ])
      .then(([profilesData, purchaseOrdersData]) => {
        if (cancelled) return;
        setApiProfiles(profilesData?.profiles ?? []);
        setOrders(purchaseOrdersData);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = useCallback(
    async (order: PurchaseOrder) => {
      const saved = await createPurchaseOrderApi(order);
      if (!saved) {
        alert("Could not save purchase order. Please check that the backend is running.");
        return;
      }
      addPurchaseOrder(saved);
      await loadOrders();
    },
    [addPurchaseOrder, loadOrders]
  );

  const handleUpdate = useCallback(
    async (order: PurchaseOrder) => {
      const saved = await updatePurchaseOrderApi(order);
      if (!saved) {
        alert("Could not update purchase order. Please check that the backend is running.");
        return;
      }
      replacePurchaseOrder(saved);
      setEditOpen(false);
      setEditingOrder(null);
      await loadOrders();
    },
    [replacePurchaseOrder, loadOrders]
  );

  const handleDelete = useCallback(
    async (order: PurchaseOrder) => {
      if (!confirm(`Delete purchase order ${order.poNumber}?`)) return;
      const ok = await deletePurchaseOrderApi(order.id);
      if (!ok) {
        alert("Could not delete purchase order. Please check that the backend is running.");
        return;
      }
      deletePurchaseOrder(order.id);
      await loadOrders();
    },
    [deletePurchaseOrder, loadOrders]
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

  const handleSearch = useCallback((row: PurchaseOrder, query: string) => {
    const q = query.toLowerCase();
    const codes = (row.items ?? []).map((i) => i.profileCode).join(" ").toLowerCase();
    return (
      row.poNumber?.toLowerCase().includes(q) ||
      row.vendorName?.toLowerCase().includes(q) ||
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
        className: "min-w-[180px] max-w-[280px] truncate font-medium",
        align: "left",
        render: (row) => (
          <span className="block truncate" title={row.vendorName}>
            {row.vendorName}
          </span>
        ),
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
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="View purchase order"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{row.poNumber}</DialogTitle>
                </DialogHeader>
                <PurchaseOrderDetail order={row} />
              </DialogContent>
            </Dialog>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Edit purchase order"
              onClick={() => {
                setEditingOrder(row);
                setEditOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              aria-label="Delete purchase order"
              onClick={() => handleDelete(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Download PDF"
              onClick={() => handleDownload(row)}
            >
              <FileDown className="h-4 w-4" />
            </Button>
          </TableRowActions>
        ),
      },
    ],
    [handleDelete, handleDownload]
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

      <DataTable
        tableId="purchase-orders"
        data={orders}
        columns={columns}
        isLoading={isLoading}
        loadingMessage="Loading purchase orders…"
        searchFilter={handleSearch}
        searchPlaceholder="Search PO number, party, or profile code..."
        emptyMessage="No purchase orders yet. Create one to get started."
      />
    </div>
  );
}
