"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Search, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CrudPermissionSwitch } from "@/components/settings/crud-permission-checks";
import { SettingsPanel, SettingsSection } from "@/components/settings/settings-section";
import { saveAppSettingsApi } from "@/lib/app-settings-api";
import { useAppStore } from "@/lib/store";
import {
  CRUD_ACTIONS,
  CRUD_ACTION_LABELS,
  CRUD_ACTION_TITLES,
  PERMISSION_AREAS,
  ROLE_LABELS,
  clearUserPermissionOverrides,
  countEnabledModulesForUser,
  getEffectiveCrudForUser,
  getRoleDefaultCrud,
  hasCustomUserOverrides,
  isUserCrudOverride,
  setUserCrudOverride,
  type CrudAction,
} from "@/lib/role-permissions";
import { cn } from "@/lib/utils";

export function UserPermissionsCard() {
  const rolePermissions = useAppStore((s) => s.rolePermissions);
  const userPermissionOverrides = useAppStore((s) => s.userPermissionOverrides);
  const setUserPermissionOverrides = useAppStore((s) => s.setUserPermissionOverrides);
  const users = useAppStore((s) => s.users);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const sortedUsers = useMemo(
    () => [...(users ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedUsers;
    return sortedUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        ROLE_LABELS[user.role].toLowerCase().includes(q)
    );
  }, [search, sortedUsers]);

  useEffect(() => {
    if (filteredUsers.length === 0) {
      setSelectedUserId(null);
      return;
    }
    if (!selectedUserId || !filteredUsers.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(filteredUsers[0].id);
    }
  }, [filteredUsers, selectedUserId]);

  const selectedUser = filteredUsers.find((user) => user.id === selectedUserId) ?? null;

  const handleCrudChange = (
    userId: string,
    permKey: string,
    action: CrudAction,
    enabled: boolean,
    roleDefault: ReturnType<typeof getRoleDefaultCrud>
  ) => {
    const next = setUserCrudOverride(
      userPermissionOverrides,
      userId,
      permKey,
      action,
      enabled,
      roleDefault
    );
    setUserPermissionOverrides(next);
    void saveAppSettingsApi({ userPermissionOverrides: next });
  };

  const handleResetUser = (userId: string) => {
    const next = clearUserPermissionOverrides(userPermissionOverrides, userId);
    setUserPermissionOverrides(next);
    void saveAppSettingsApi({ userPermissionOverrides: next });
  };

  const selectedStats = useMemo(() => {
    if (!selectedUser) return null;

    const enabledCount = countEnabledModulesForUser(
      selectedUser,
      rolePermissions,
      userPermissionOverrides
    );
    const overrideCount = PERMISSION_AREAS.filter((area) =>
      isUserCrudOverride(
        userPermissionOverrides,
        selectedUser.id,
        area.key,
        getRoleDefaultCrud(selectedUser.role, area.key, rolePermissions)
      )
    ).length;

    return { enabledCount, overrideCount };
  }, [rolePermissions, selectedUser, userPermissionOverrides]);

  const isAdmin = selectedUser?.role === "administrator";

  return (
    <SettingsPanel>
      <SettingsSection
        first
        title="User permission overrides"
        description="Configure module-level create, read, update, and delete access per user. Changes apply on top of role defaults."
        contentClassName="space-y-0 p-0"
      >
        <div className="flex flex-col gap-3 border-b border-border/80 bg-muted/20 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter users..."
              className="h-10 border-border/80 bg-background pl-9"
            />
          </div>

          <Select
            value={selectedUserId ?? undefined}
            onValueChange={setSelectedUserId}
            disabled={filteredUsers.length === 0}
          >
            <SelectTrigger className="h-10 min-w-[240px] flex-1 border-border/80 bg-background sm:max-w-sm">
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {filteredUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <span className="font-medium">{user.name}</span>
                  <span className="ml-2 text-muted-foreground">· {ROLE_LABELS[user.role]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {selectedStats ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {selectedStats.enabledCount}/{PERMISSION_AREAS.length} modules
                </span>
                {selectedStats.overrideCount > 0 ? (
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
                    {selectedStats.overrideCount} override
                    {selectedStats.overrideCount === 1 ? "" : "s"}
                  </span>
                ) : null}
              </>
            ) : null}

            {selectedUser && !isAdmin ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasCustomUserOverrides(userPermissionOverrides, selectedUser.id)}
                onClick={() => handleResetUser(selectedUser.id)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset defaults
              </Button>
            ) : null}
          </div>
        </div>

        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No users match your filter</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adjust search or add users from User Management.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 border-b border-border/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-11 w-11 shrink-0 ring-2 ring-background">
                  <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
                    {selectedUser.avatar ?? selectedUser.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{selectedUser.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{ROLE_LABELS[selectedUser.role]}</Badge>
                {selectedUser.status === "inactive" ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inactive
                  </Badge>
                ) : null}
                {isAdmin ? (
                  <Badge className="bg-emerald-600/90 hover:bg-emerald-600/90">Full access</Badge>
                ) : null}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left text-[12px] font-bold uppercase tracking-wide text-foreground/80 sm:px-6">
                      Module
                    </th>
                    {CRUD_ACTIONS.map((action) => (
                      <th
                        key={action}
                        className="w-[88px] px-3 py-3 text-center text-[12px] font-bold uppercase tracking-wide text-foreground/80"
                        title={CRUD_ACTION_TITLES[action]}
                      >
                        {CRUD_ACTION_LABELS[action]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_AREAS.map((area, index) => {
                    const roleDefault = getRoleDefaultCrud(
                      selectedUser.role,
                      area.key,
                      rolePermissions
                    );
                    const effective = getEffectiveCrudForUser(
                      selectedUser,
                      area.key,
                      rolePermissions,
                      userPermissionOverrides
                    );
                    const isOverride = isUserCrudOverride(
                      userPermissionOverrides,
                      selectedUser.id,
                      area.key,
                      roleDefault
                    );

                    return (
                      <tr
                        key={area.key}
                        className={cn(
                          index % 2 === 0 ? "bg-background" : "bg-muted/10",
                          isOverride && "bg-primary/[0.035]"
                        )}
                      >
                        <td className="border-t border-border/60 px-4 py-3.5 sm:px-6">
                          <div className="flex items-start gap-2">
                            {isOverride ? (
                              <span
                                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                                title="Custom override"
                              />
                            ) : (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-transparent" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">{area.label}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{area.description}</p>
                            </div>
                          </div>
                        </td>
                        {CRUD_ACTIONS.map((action) => (
                          <td
                            key={action}
                            className="border-t border-border/60 px-3 py-3.5 text-center align-middle"
                          >
                            <div className="flex justify-center">
                              <CrudPermissionSwitch
                                id={`${selectedUser.id}-${area.key}-${action}`}
                                action={action}
                                permissions={effective}
                                disabled={isAdmin}
                                onChange={(changedAction, enabled) =>
                                  handleCrudChange(
                                    selectedUser.id,
                                    area.key,
                                    changedAction,
                                    enabled,
                                    roleDefault
                                  )
                                }
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border/80 bg-muted/15 px-4 py-3 text-[11px] text-muted-foreground sm:px-6">
              {CRUD_ACTIONS.map((action) => (
                <span key={action}>
                  <strong className="font-semibold text-foreground/85">
                    {CRUD_ACTION_LABELS[action]}
                  </strong>
                  <span className="mx-1.5 text-border">·</span>
                  {CRUD_ACTION_TITLES[action]}
                </span>
              ))}
            </div>
          </>
        )}
      </SettingsSection>
    </SettingsPanel>
  );
}
