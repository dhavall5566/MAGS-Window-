"use client";

import { Pencil, Scissors, Trash2 } from "lucide-react";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { Button } from "@/components/ui/button";
import { isSplittableStockInward } from "@/lib/stock-inward-split";
import type { StockInward } from "@/types";

interface StockInwardRowActionsProps {
  entry: StockInward;
  onEdit: (entry: StockInward) => void;
  onDelete: (entry: StockInward) => void;
  onSplit: (entry: StockInward) => void;
}

export function StockInwardRowActions({
  entry,
  onEdit,
  onDelete,
  onSplit,
}: StockInwardRowActionsProps) {
  const canSplit = isSplittableStockInward(entry);

  return (
    <TableRowActions>
      {canSplit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onSplit(entry)}
          aria-label={`Split length for ${entry.inwardNo}`}
        >
          <Scissors className="h-4 w-4" />
        </Button>
      )}
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
