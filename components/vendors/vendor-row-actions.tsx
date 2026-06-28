"use client";

import { Pencil, Trash2 } from "lucide-react";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { Button } from "@/components/ui/button";
import type { Vendor } from "@/types";

interface VendorRowActionsProps {
  vendor: Vendor;
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendor: Vendor) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export function VendorRowActions({
  vendor,
  onEdit,
  onDelete,
  canUpdate = true,
  canDelete = true,
}: VendorRowActionsProps) {
  return (
    <TableRowActions>
      {canUpdate ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(vendor)}
          aria-label={`Edit ${vendor.partyName}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(vendor)}
          aria-label={`Delete ${vendor.partyName}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </TableRowActions>
  );
}
