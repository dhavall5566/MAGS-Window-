"use client";

import { Mail, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getDefaultUser } from "@/lib/auth";
import { UserPermissionsCard } from "@/components/settings/user-permissions-card";
import { SettingsPanel } from "@/components/settings/settings-section";

const ROLE_LABELS: Record<string, string> = {
  administrator: "Administrator",
  store_manager: "Store Manager",
  production_user: "Production User",
};

export function UserSettingsPanel() {
  const user = getDefaultUser();

  return (
    <div className="space-y-6">
      <SettingsPanel>
        <div className="flex flex-col gap-5 border-b border-border/80 bg-muted/20 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-background shadow-sm">
              <AvatarFallback className="bg-primary text-base font-semibold text-primary-foreground">
                {user.avatar ?? user.name?.slice(0, 2) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold leading-tight">{user.name}</p>
                <Badge variant="secondary" className="text-[11px] font-medium">
                  {ROLE_LABELS[user.role ?? ""] ?? user.role}
                </Badge>
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-lg border border-border/70 bg-background px-3.5 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Department
              </dt>
              <dd className="mt-1 text-sm font-medium">{user.department ?? "—"}</dd>
            </div>
            <div className="rounded-lg border border-border/70 bg-background px-3.5 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </dt>
              <dd className="mt-1 text-sm font-medium capitalize">{user.status ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="flex items-center gap-2 border-b border-border/80 px-5 py-3 sm:px-6">
          <User className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Signed-in session profile. Permission changes below apply organization-wide.
          </p>
        </div>
      </SettingsPanel>

      <UserPermissionsCard />
    </div>
  );
}
