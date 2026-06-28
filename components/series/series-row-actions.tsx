"use client";

import { Pencil, Trash2 } from "lucide-react";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { SeriesName } from "@/types";

interface SeriesRowActionsProps {
  series: SeriesName;
  linkedProfileCount: number;
  onEdit: (series: SeriesName) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (series: SeriesName) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export function SeriesRowActions({
  series,
  linkedProfileCount,
  onEdit,
  onToggleStatus,
  onDelete,
  canUpdate = true,
  canDelete = true,
}: SeriesRowActionsProps) {
  const deleteBlocked = linkedProfileCount > 0;
  const deleteTitle = deleteBlocked
    ? `Cannot delete — ${linkedProfileCount} profile(s) in Profile Master use this series`
    : `Delete ${series.name}${series.seriesNo}`;

  return (
    <TableRowActions>
      {canUpdate ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(series)}
          aria-label="Edit series"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive disabled:opacity-40"
          onClick={() => onDelete(series)}
          aria-label={deleteTitle}
          title={deleteTitle}
          disabled={deleteBlocked}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
      {canUpdate ? (
        <Switch
          checked={series.status === "active"}
          onCheckedChange={() => onToggleStatus(series.id)}
          aria-label={`Toggle ${series.name}${series.seriesNo} active status`}
        />
      ) : null}
    </TableRowActions>
  );
}
