"use client";

import { Pencil } from "lucide-react";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { SeriesName } from "@/types";

interface SeriesRowActionsProps {
  series: SeriesName;
  onEdit: (series: SeriesName) => void;
  onToggleStatus: (id: string) => void;
}

export function SeriesRowActions({
  series,
  onEdit,
  onToggleStatus,
}: SeriesRowActionsProps) {
  return (
    <TableRowActions>
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
      <Switch
        checked={series.status === "active"}
        onCheckedChange={() => onToggleStatus(series.id)}
        aria-label={`Toggle ${series.name}${series.seriesNo} active status`}
      />
    </TableRowActions>
  );
}
