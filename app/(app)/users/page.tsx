"use client";

import { useCallback, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { AddUserDialog } from "@/components/users/add-user-dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppStore } from "@/lib/store";
import type { User } from "@/types";

const ROLE_LABELS: Record<string, string> = {
  administrator: "Administrator",
  store_manager: "Store Manager",
  production_user: "Production User",
};

export default function UsersPage() {
  const users = useAppStore((s) => s.users);
  const addUser = useAppStore((s) => s.addUser);

  const existingEmails = useMemo(
    () => (users ?? []).map((user) => user.email),
    [users]
  );

  const handleSearch = useCallback((row: User, query: string) => {
    const q = query.toLowerCase();
    return (
      row.name?.toLowerCase().includes(q) ||
      row.email?.toLowerCase().includes(q) ||
      row.department?.toLowerCase().includes(q) ||
      (ROLE_LABELS[row.role ?? ""] ?? row.role ?? "").toLowerCase().includes(q)
    );
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "User",
        className: "min-w-[200px]",
        align: "left" as const,
        render: (row: User) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {row.avatar ?? row.name?.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{row.name}</p>
              <p className="text-xs text-muted-foreground">{row.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: "department",
        header: "Department",
        className: "whitespace-nowrap",
        align: "left" as const,
      },
      {
        key: "role",
        header: "Role",
        className: "whitespace-nowrap",
        align: "left" as const,
        render: (row: User) => (
          <Badge variant="outline" className="text-xs">
            {ROLE_LABELS[row.role ?? ""] ?? row.role}
          </Badge>
        ),
      },
      {
        key: "status",
        header: "Status",
        className: "whitespace-nowrap",
        align: "left" as const,
        render: (row: User) => (
          <Badge variant={row.status === "active" ? "success" : "secondary"}>
            {row.status ?? "active"}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader title="User Management" description="Manage system users and role-based access">
        <AddUserDialog existingEmails={existingEmails} onSave={addUser} />
      </PageHeader>
      <DataTable
        tableId="users"
        data={users ?? []}
        columns={columns}
        searchFilter={handleSearch}
        searchPlaceholder="Search name, email, department, or role..."
      />
    </div>
  );
}
