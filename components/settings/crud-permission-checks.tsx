"use client";

import { cn } from "@/lib/utils";
import {
  CRUD_ACTIONS,
  CRUD_ACTION_LABELS,
  CRUD_ACTION_TITLES,
  type CrudAction,
  type CrudPermissions,
} from "@/lib/role-permissions";
import { Switch } from "@/components/ui/switch";

interface CrudPermissionChecksProps {
  idPrefix: string;
  permissions: CrudPermissions;
  disabled?: boolean;
  compact?: boolean;
  onChange: (action: CrudAction, enabled: boolean) => void;
}

interface CrudPermissionSwitchProps {
  id: string;
  action: CrudAction;
  permissions: CrudPermissions;
  disabled?: boolean;
  onChange: (action: CrudAction, enabled: boolean) => void;
}

export function CrudPermissionSwitch({
  id,
  action,
  permissions,
  disabled = false,
  onChange,
}: CrudPermissionSwitchProps) {
  const actionDisabled = disabled || (action !== "read" && !permissions.read);

  return (
    <Switch
      id={id}
      checked={permissions[action]}
      disabled={actionDisabled}
      className="data-[state=checked]:bg-primary"
      onCheckedChange={(checked) => onChange(action, checked)}
      aria-label={CRUD_ACTION_TITLES[action]}
    />
  );
}

export function CrudPermissionChecks({
  idPrefix,
  permissions,
  disabled = false,
  compact = false,
  onChange,
}: CrudPermissionChecksProps) {
  return (
    <div className={cn("flex items-center", compact ? "gap-1" : "gap-2")}>
      {CRUD_ACTIONS.map((action) => {
        const actionDisabled =
          disabled || (action !== "read" && !permissions.read);

        return (
          <div
            key={action}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border px-1.5 py-1.5",
              compact ? "min-w-[2.5rem]" : "min-w-[2.75rem]",
              permissions[action]
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-background",
              actionDisabled && !disabled && "opacity-50"
            )}
            title={CRUD_ACTION_TITLES[action]}
          >
            <span
              className={cn(
                "text-[10px] font-bold leading-none",
                permissions[action] ? "text-primary" : "text-muted-foreground"
              )}
            >
              {CRUD_ACTION_LABELS[action]}
            </span>
            <Switch
              id={`${idPrefix}-${action}`}
              checked={permissions[action]}
              disabled={actionDisabled}
              className="scale-75 data-[state=checked]:bg-primary"
              onCheckedChange={(checked) => onChange(action, checked)}
              aria-label={CRUD_ACTION_TITLES[action]}
            />
          </div>
        );
      })}
    </div>
  );
}
