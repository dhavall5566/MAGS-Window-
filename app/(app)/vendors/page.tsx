"use client";

import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { AddVendorDialog } from "@/components/vendors/add-vendor-dialog";
import { EditVendorDialog } from "@/components/vendors/edit-vendor-dialog";
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
import { useAppStore } from "@/lib/store";
import { useModuleCrud } from "@/hooks/use-module-crud";
import { formatPartyAddress, getVendorTypeLabel } from "@/lib/vendor";
import { isMockVendorId } from "@/lib/vendor-merge";
import type { Vendor, VendorType } from "@/types";

type VendorTypeFilter = VendorType | "all";

function displayValue(value: string | undefined) {
  return value?.trim() ? value : "—";
}

export default function VendorsPage() {
  const { canCreate, canUpdate, canDelete } = useModuleCrud("vendors");
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<VendorTypeFilter>("all");

  const storeVendors = useAppStore((s) => s.vendors);
  const vendors = storeVendors ?? [];
  const addVendor = useAppStore((s) => s.addVendor);
  const updateVendor = useAppStore((s) => s.updateVendor);
  const deleteVendor = useAppStore((s) => s.deleteVendor);
  const upsertVendor = useAppStore((s) => s.upsertVendor);

  const handleAddVendor = useCallback(
    async (vendor: Vendor) => {
      addVendor(vendor);
      const saved = await createVendorApi(vendor);
      if (saved) {
        upsertVendor(saved);
      }
      showAddedToast("Vendor");
    },
    [addVendor, upsertVendor]
  );

  const handleUpdateVendor = useCallback(
    async (
      id: string,
      updates: Pick<
        Vendor,
        "partyName" | "partyAddress" | "personName" | "phoneNo" | "email" | "vendorType" | "gstNo"
      >
    ) => {
      updateVendor(id, updates);
      const saved = await updateVendorApi(id, updates);
      if (saved) {
        upsertVendor(saved);
      }
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
      if (isMockVendorId(vendor.id)) {
        alert("Seeded vendors cannot be deleted.");
        return;
      }
      if (!confirm(`Delete vendor ${vendor.partyName}?`)) return;

      deleteVendor(vendor.id);
      const ok = await deleteVendorApi(vendor.id);
      if (!ok) {
        upsertVendor(vendor);
        alert("Could not delete vendor from the server. It was restored locally.");
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
    </div>
  );
}
