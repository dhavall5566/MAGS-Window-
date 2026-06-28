"use client";

import { useMemo } from "react";
import { getCurrentUser } from "@/lib/auth";
import {
  canPerformCrudAction,
  type CrudAction,
  type PermissionKey,
} from "@/lib/role-permissions";
import { useAppStore } from "@/lib/store";

export interface ModuleCrudAccess {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  can: (action: CrudAction) => boolean;
}

export function useModuleCrud(permKey: PermissionKey | string): ModuleCrudAccess {
  const rolePermissions = useAppStore((s) => s.rolePermissions);
  const userPermissionOverrides = useAppStore((s) => s.userPermissionOverrides);
  const user = getCurrentUser();

  return useMemo(() => {
    const can = (action: CrudAction) =>
      canPerformCrudAction(
        user,
        permKey,
        action,
        rolePermissions,
        userPermissionOverrides
      );

    return {
      canCreate: can("create"),
      canRead: can("read"),
      canUpdate: can("update"),
      canDelete: can("delete"),
      can,
    };
  }, [permKey, rolePermissions, user, userPermissionOverrides]);
}
