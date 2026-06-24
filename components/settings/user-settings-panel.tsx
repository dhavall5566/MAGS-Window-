"use client";

import { User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getDefaultUser } from "@/lib/auth";
import { UserPermissionsCard } from "@/components/settings/user-permissions-card";

const ROLE_LABELS: Record<string, string> = {
  administrator: "Administrator",
  store_manager: "Store Manager",
  production_user: "Production User",
};

export function UserSettingsPanel() {
  const user = getDefaultUser();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile
          </CardTitle>
          <CardDescription>Your account details in this demo session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary text-primary-foreground text-base">
                {user.avatar ?? user.name?.slice(0, 2) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <p className="text-lg font-semibold leading-tight">{user.name}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <Badge variant="secondary" className="mt-1">
                {ROLE_LABELS[user.role ?? ""] ?? user.role}
              </Badge>
            </div>
          </div>

          <dl className="grid gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Department
              </dt>
              <dd className="mt-0.5 font-medium">{user.department ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </dt>
              <dd className="mt-0.5 font-medium capitalize">{user.status ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <UserPermissionsCard />
    </div>
  );
}
