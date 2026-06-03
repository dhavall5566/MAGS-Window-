"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userSchema } from "@/lib/validations";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { USER_ROLES } from "@/lib/constants";
import { roleLabels } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Loader2, UserCog } from "lucide-react";
import type { UserRole } from "@/lib/types";

type FormData = z.infer<typeof userSchema>;

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const { register, handleSubmit, setValue, reset, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "PRODUCTION_USER", status: "ACTIVE" },
  });

  const load = () => fetch("/api/users").then((r) => r.json()).then(setUsers);
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ role: "PRODUCTION_USER", status: "ACTIVE", password: "" });
    setDialogOpen(true);
  };

  const openEdit = (user: UserRow) => {
    setEditing(user);
    reset({ name: user.name, email: user.email, role: user.role, status: user.status as "ACTIVE" | "INACTIVE" });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    const url = editing ? `/api/users/${editing.id}` : "/api/users";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
      return;
    }
    toast.success(editing ? "User updated" : "User created");
    setDialogOpen(false);
    load();
  };

  const toggleStatus = async (user: UserRow) => {
    await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
    });
    toast.success("User status updated");
    load();
  };

  return (
    <div>
      <PageHeader title="User Management" description="Manage system users, roles, and access">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />Add User
        </Button>
      </PageHeader>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{roleLabels[u.role]}</TableCell>
                <TableCell>
                  <Badge variant={u.status === "ACTIVE" ? "success" : "secondary"}>{u.status}</Badge>
                </TableCell>
                <TableCell>{formatDate(u.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                      <UserCog className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleStatus(u)}>
                      {u.status === "ACTIVE" ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...register("email")} disabled={!!editing} />
            </div>
            <div className="space-y-2">
              <Label>{editing ? "New Password (optional)" : "Password"}</Label>
              <Input type="password" {...register("password")} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select defaultValue="PRODUCTION_USER" onValueChange={(v) => setValue("role", v as FormData["role"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Update User" : "Create User"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
