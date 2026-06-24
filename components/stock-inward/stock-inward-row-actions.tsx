"use client";

import { Pencil, Trash2 } from "lucide-react";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { Button } from "@/components/ui/button";
import type { StockInward } from "@/types";

interface StockInwardRowActionsProps {
  entry: StockInward;
  onEdit: (entry: StockInward) => void;
  onDelete: (entry: StockInward) => void;
}

export function StockInwardRowActions({
  entry,
  onEdit,
  onDelete,
}: StockInwardRowActionsProps) {
  return (
    <TableRowActions>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onEdit(entry)}
        aria-label={`Edit ${entry.inwardNo}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => onDelete(entry)}
        aria-label={`Delete ${entry.inwardNo}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </TableRowActions>
  );
}
