"use client";

import { History, Pencil, Trash2 } from "lucide-react";
import { TableRowActions } from "@/components/shared/table-row-actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Profile } from "@/types";

interface ProfileRowActionsProps {
  profile: Profile;
  onEdit: (profile: Profile) => void;
  onPriceHistory: (profile: Profile) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (profile: Profile) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export function ProfileRowActions({
  profile,
  onEdit,
  onPriceHistory,
  onToggleStatus,
  onDelete,
  canUpdate = true,
  canDelete = true,
}: ProfileRowActionsProps) {
  const inactive = profile.status === "inactive";

  return (
    <TableRowActions>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onPriceHistory(profile)}
        aria-label="View price history"
        disabled={inactive}
      >
        <History className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onEdit(profile)}
        aria-label="Edit profile"
        disabled={inactive || !canUpdate}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      {canDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(profile)}
          aria-label={`Delete ${profile.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
      {canUpdate ? (
        <Switch
          checked={profile.status === "active"}
          onCheckedChange={() => onToggleStatus(profile.id)}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Toggle ${profile.name} active status`}
        />
      ) : null}
    </TableRowActions>
  );
}
