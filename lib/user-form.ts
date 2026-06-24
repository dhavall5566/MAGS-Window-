import { z } from "zod";

export const userRoleSchema = z.enum([
  "administrator",
  "store_manager",
  "production_user",
]);

export const userStatusSchema = z.enum(["active", "inactive"]);

export const userFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  role: userRoleSchema,
  department: z.string().min(1, "Department is required"),
  status: userStatusSchema,
});

export type UserFormData = z.infer<typeof userFormSchema>;

export const USER_ROLE_OPTIONS: { value: UserFormData["role"]; label: string }[] = [
  { value: "administrator", label: "Administrator" },
  { value: "store_manager", label: "Store Manager" },
  { value: "production_user", label: "Production User" },
];

export const USER_STATUS_OPTIONS: { value: UserFormData["status"]; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function getUserAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
