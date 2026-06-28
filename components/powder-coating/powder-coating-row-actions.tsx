"use client";

import { Pencil, Trash2 } from "lucide-react";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { Button } from "@/components/ui/button";
import type { PowderCoating } from "@/types";

interface PowderCoatingRowActionsProps {
  entry: PowderCoating;
  onEdit: (entry: PowderCoating) => void;
  onDelete: (entry: PowderCoating) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export function PowderCoatingRowActions({
  entry,
  onEdit,
  onDelete,
  canUpdate = true,
  canDelete = true,
}: PowderCoatingRowActionsProps) {
  return (
    <TableRowActions>
      {canUpdate ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(entry)}
          aria-label={`Edit ${entry.batchNo}`}
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
          onClick={() => onDelete(entry)}
          aria-label={`Delete ${entry.batchNo}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </TableRowActions>
  );
}
