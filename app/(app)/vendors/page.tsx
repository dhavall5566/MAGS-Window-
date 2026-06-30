"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { VendorRowActions } from "@/components/vendors/vendor-row-actions";
import { Badge } from "@/components/ui/badge";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { VENDOR_TYPE_OPTIONS } from "@/lib/vendor-form";
import { showAddedToast, showDeletedToast, showSavedToast } from "@/lib/toast";
import {
  createVendorApi,
  deleteVendorApi,
  updateVendorApi,
} from "@/lib/vendor-api";
import { syncListCache } from "@/lib/list-cache-sync";
import { alertSyncFailure } from "@/lib/sync-alert";
import { useAppStore } from "@/lib/store";
import { useModuleCrud } from "@/hooks/use-module-crud";
import { formatPartyAddress, getVendorTypeLabel } from "@/lib/vendor";
import {
  getVendorDeleteAssociations,
  type VendorAssociationGroup,
} from "@/lib/vendor-associations";
import type { Vendor, VendorType } from "@/types";

const AddVendorDialog = dynamic(
  () => import("@/components/vendors/add-vendor-dialog").then((m) => m.AddVendorDialog),
  { ssr: false }
);

const EditVendorDialog = dynamic(
  () => import("@/components/vendors/edit-vendor-dialog").then((m) => m.EditVendorDialog),
  { ssr: false }
);

const VendorDeleteBlockedDialog = dynamic(
  () =>
    import("@/components/vendors/vendor-delete-blocked-dialog").then(
      (m) => m.VendorDeleteBlockedDialog
    ),
  { ssr: false }
);

type VendorTypeFilter = VendorType | "all";

function displayValue(value: string | undefined) {
  return value?.trim() ? value : "—";
}

export default function VendorsPage() {
  const { canCreate, canUpdate, canDelete } = useModuleCrud("vendors");
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<VendorTypeFilter>("all");
  const [deleteBlocked, setDeleteBlocked] = useState<{
    vendorName: string;
    associations: VendorAssociationGroup[];
    fallbackMessage?: string;
  } | null>(null);

  const storeVendors = useAppStore((s) => s.vendors);
  const vendors = storeVendors ?? [];
  const addVendor = useAppStore((s) => s.addVendor);
  const updateVendor = useAppStore((s) => s.updateVendor);
  const deleteVendor = useAppStore((s) => s.deleteVendor);
  const upsertVendor = useAppStore((s) => s.upsertVendor);

  const handleAddVendor = useCallback(
    async (vendor: Vendor) => {
      addVendor(vendor);
      syncListCache("/api/vendors", "vendors", useAppStore.getState().vendors ?? []);
      const saved = await createVendorApi(vendor);
      if (!saved) {
        deleteVendor(vendor.id);
        syncListCache("/api/vendors", "vendors", useAppStore.getState().vendors ?? []);
        alertSyncFailure("Could not save vendor to the server.");
        return;
      }
      upsertVendor(saved);
      syncListCache("/api/vendors", "vendors", useAppStore.getState().vendors ?? []);
      showAddedToast("Vendor");
    },
    [addVendor, deleteVendor, upsertVendor]
  );

  const handleUpdateVendor = useCallback(
    async (
      id: string,
      updates: Pick<
        Vendor,
        "partyName" | "partyAddress" | "personName" | "phoneNo" | "email" | "vendorType" | "gstNo"
      >
    ) => {
      const current = (useAppStore.getState().vendors ?? []).find((vendor) => vendor.id === id);
      if (!current) return;

      updateVendor(id, updates);
      syncListCache("/api/vendors", "vendors", useAppStore.getState().vendors ?? []);
      const saved = await updateVendorApi(id, updates);
      if (!saved) {
        upsertVendor(current);
        syncListCache("/api/vendors", "vendors", useAppStore.getState().vendors ?? []);
        alertSyncFailure("Could not update vendor on the server.");
        return;
      }
      upsertVendor(saved);
      syncListCache("/api/vendors", "vendors", useAppStore.getState().vendors ?? []);
      showSavedToast("Vendor");
    },
    [updateVendor, upsertVendor]
  );

  const handleEdit = useCallback((vendor: Vendor) => {
    setEditingVendor(vendor);
    setEditOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (vendor: Vendor) => {
      const state = useAppStore.getState();
      const associations = getVendorDeleteAssociations(vendor, {
        stockInward: state.stockInward,
        purchaseOrders: state.purchaseOrders,
        challans: state.challans,
        powderCoating: state.powderCoating,
      });
      if (associations.length > 0) {
        setDeleteBlocked({
          vendorName: vendor.partyName,
          associations,
        });
        return;
      }

      if (!confirm(`Delete vendor ${vendor.partyName}?`)) return;

      deleteVendor(vendor.id);
      syncListCache("/api/vendors", "vendors", useAppStore.getState().vendors ?? []);
      const result = await deleteVendorApi(vendor.id);
      if (!result.ok) {
        upsertVendor(vendor);
        syncListCache("/api/vendors", "vendors", useAppStore.getState().vendors ?? []);
        if (result.status === 409) {
          setDeleteBlocked({
            vendorName: vendor.partyName,
            associations: [],
            fallbackMessage: result.error,
          });
        } else {
          alert(result.error);
        }
        return;
      }
      showDeletedToast("Vendor");
    },
    [deleteVendor, upsertVendor]
  );

  const filteredVendors = useMemo(
    () =>
      (vendors ?? []).filter((vendor) =>
        typeFilter === "all" ? true : vendor.vendorType === typeFilter
      ),
    [vendors, typeFilter]
  );

  const handleVendorSearch = useCallback((row: Vendor, query: string) => {
    const q = query.toLowerCase();
    const name = row.partyName?.toLowerCase() ?? "";
    const address = row.partyAddress?.toLowerCase() ?? "";
    const person = row.personName?.toLowerCase() ?? "";
    const phone = row.phoneNo?.toLowerCase() ?? "";
    const email = row.email?.toLowerCase() ?? "";
    const type = getVendorTypeLabel(row.vendorType).toLowerCase();
    const gst = row.gstNo?.toLowerCase() ?? "";
    return (
      name.includes(q) ||
      address.includes(q) ||
      person.includes(q) ||
      phone.includes(q) ||
      email.includes(q) ||
      gst.includes(q) ||
      type.includes(q)
    );
  }, []);

  const handleClearFilters = useCallback(() => {
    setTypeFilter("all");
  }, []);

  const tableFilters = (
    <SegmentedControl
      value={typeFilter}
      onValueChange={setTypeFilter}
      options={[
        { value: "all", label: "All types" },
        ...VENDOR_TYPE_OPTIONS,
      ]}
    />
  );

  const columns = useMemo(
    () => [
      {
        key: "partyName",
        header: "Party Name",
        className: "min-w-[160px] font-medium",
        align: "left" as const,
        render: (row: Vendor) => row.partyName,
      },
      {
        key: "vendorType",
        header: "Type",
        className: "whitespace-nowrap",
        align: "left" as const,
        render: (row: Vendor) => (
          <Badge variant="outline" className="text-xs">
            {getVendorTypeLabel(row.vendorType)}
          </Badge>
        ),
      },
      {
        key: "partyAddress",
        header: "Party Address",
        className: "min-w-[180px] max-w-[260px] truncate text-muted-foreground",
        align: "left" as const,
        render: (row: Vendor) => (
          <span className="block truncate" title={formatPartyAddress(row.partyAddress)}>
            {formatPartyAddress(row.partyAddress)}
          </span>
        ),
      },
      {
        key: "gstNo",
        header: "GST No.",
        className: "whitespace-nowrap font-mono text-sm",
        align: "left" as const,
        render: (row: Vendor) => displayValue(row.gstNo?.toUpperCase()),
      },
      {
        key: "personName",
        header: "Person Name",
        className: "whitespace-nowrap",
        align: "left" as const,
        render: (row: Vendor) => displayValue(row.personName),
      },
      {
        key: "phoneNo",
        header: "Phone No",
        className: "whitespace-nowrap font-mono text-sm",
        align: "left" as const,
        render: (row: Vendor) => displayValue(row.phoneNo),
      },
      {
        key: "email",
        header: "Email",
        className: "min-w-[160px] truncate text-sm",
        align: "left" as const,
        render: (row: Vendor) => (
          <span className="block truncate" title={row.email}>
            {displayValue(row.email)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        className: "whitespace-nowrap",
        align: "right" as const,
        sticky: true,
        render: (row: Vendor) => (
          <VendorRowActions
            vendor={row}
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
        title="Vendors"
        description="Party names and addresses for outward, coating, and delivery partners"
      >
        {canCreate ? <AddVendorDialog onSave={handleAddVendor} /> : null}
      </PageHeader>
      <DataTable
        tableId="vendors"
        data={filteredVendors}
        columns={columns}
        searchFilter={handleVendorSearch}
        searchPlaceholder="Search party name, address, person, phone, email, or type..."
        filterContent={tableFilters}
        filtersActive={typeFilter !== "all"}
        onClearFilters={handleClearFilters}
      />
      <EditVendorDialog
        vendor={editingVendor}
        open={editOpen}
        onOpenChange={(next) => {
          setEditOpen(next);
          if (!next) setEditingVendor(null);
        }}
        onSave={handleUpdateVendor}
      />
      <VendorDeleteBlockedDialog
        open={deleteBlocked != null}
        onOpenChange={(next) => {
          if (!next) setDeleteBlocked(null);
        }}
        vendorName={deleteBlocked?.vendorName ?? ""}
        associations={deleteBlocked?.associations ?? []}
        fallbackMessage={deleteBlocked?.fallbackMessage}
      />
    </div>
  );
}
