"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield, RotateCcw, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import {
  PERMISSION_AREAS,
  ROLE_LABELS,
  clearUserPermissionOverrides,
  getRoleDefaultAccess,
  isPermissionEnabledForUser,
  toggleUserPermissionOverride,
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

  const handleToggle = (
    userId: string,
    role: (typeof sortedUsers)[number]["role"],
    permKey: string,
    enabled: boolean
  ) => {
    const roleDefault = getRoleDefaultAccess(role, permKey, rolePermissions);
    setUserPermissionOverrides(
      toggleUserPermissionOverride(
        userPermissionOverrides,
        userId,
        permKey,
        enabled,
        roleDefault
      )
    );
  };

  const handleResetUser = (userId: string) => {
    setUserPermissionOverrides(clearUserPermissionOverrides(userPermissionOverrides, userId));
  };

  const hasCustomOverrides = (userId: string) =>
    Boolean(userPermissionOverrides[userId] && Object.keys(userPermissionOverrides[userId]).length > 0);

  const getEnabledCount = (user: (typeof sortedUsers)[number]) =>
    PERMISSION_AREAS.filter((area) =>
      isPermissionEnabledForUser(user, area.key, rolePermissions, userPermissionOverrides)
    ).length;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          User Permissions
        </CardTitle>
        <CardDescription>
          Select a user, then toggle module access. Changes apply when that user signs in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="w-full shrink-0 space-y-2 lg:w-64">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users..."
                className="h-9 pl-8"
              />
            </div>
            <div className="max-h-[min(420px,50vh)] overflow-y-auto rounded-lg border bg-muted/20 p-1">
              {filteredUsers.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">No users found</p>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = user.id === selectedUserId;
                  const customOverrides = hasCustomOverrides(user.id);
                  const enabledCount = getEnabledCount(user);

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                        isSelected
                          ? "bg-primary/10 ring-1 ring-primary/25"
                          : "hover:bg-muted/60"
                      )}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/15 text-primary text-xs">
                          {user.avatar ?? user.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {enabledCount}/{PERMISSION_AREAS.length}
                        </span>
                        {customOverrides ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Custom permissions" />
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 rounded-lg border bg-muted/10 p-4">
            {!selectedUser ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Select a user to manage permissions
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/15 text-primary text-sm">
                        {selectedUser.avatar ?? selectedUser.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium leading-tight truncate">{selectedUser.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{selectedUser.email}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {ROLE_LABELS[selectedUser.role]}
                        </Badge>
                        {selectedUser.status === "inactive" ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Inactive
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {selectedUser.role === "administrator" ? (
                    <span className="text-xs text-muted-foreground shrink-0">Full access</span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={!hasCustomOverrides(selectedUser.id)}
                      onClick={() => handleResetUser(selectedUser.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset defaults
                    </Button>
                  )}
                </div>

                <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
                  {PERMISSION_AREAS.map((area) => {
                    const isAdmin = selectedUser.role === "administrator";
                    const enabled = isPermissionEnabledForUser(
                      selectedUser,
                      area.key,
                      rolePermissions,
                      userPermissionOverrides
                    );
                    const roleDefault = getRoleDefaultAccess(
                      selectedUser.role,
                      area.key,
                      rolePermissions
                    );
                    const isOverride =
                      !isAdmin &&
                      userPermissionOverrides[selectedUser.id]?.[area.key] !== undefined;

                    return (
                      <div
                        key={area.key}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-md border bg-background/70 px-2.5 py-2",
                          isOverride && "border-primary/30 bg-primary/5"
                        )}
                        title={area.description}
                      >
                        <Label
                          htmlFor={`${selectedUser.id}-${area.key}`}
                          className="min-w-0 truncate text-sm font-medium leading-none"
                        >
                          {area.label}
                          {isOverride ? (
                            <span className="ml-1 text-[10px] font-normal text-primary">
                              · custom
                            </span>
                          ) : null}
                        </Label>
                        <Switch
                          id={`${selectedUser.id}-${area.key}`}
                          checked={enabled}
                          disabled={isAdmin}
                          className="shrink-0"
                          onCheckedChange={(checked) =>
                            handleToggle(selectedUser.id, selectedUser.role, area.key, checked)
                          }
                          aria-label={`${area.label} access for ${selectedUser.name}${
                            isOverride ? `, role default ${roleDefault ? "on" : "off"}` : ""
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
