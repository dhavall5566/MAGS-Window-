import type { User, UserRole } from "@/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  administrator: "Administrator",
  store_manager: "Store Manager",
  production_user: "Production User",
};

export const PERMISSION_AREAS = [
  { key: "dashboard", label: "Dashboard", description: "Overview and KPIs" },
  { key: "profiles", label: "Profiles", description: "Aluminium profile master" },
  { key: "series", label: "Series Name", description: "Profile series master" },
  { key: "stock", label: "Stock", description: "Stock inward and stock master" },
  { key: "consumption", label: "Consumption", description: "Material consumption" },
  { key: "coating", label: "Powder Coating", description: "Coating batches" },
  { key: "challans", label: "Challans", description: "Outward, coating, and return challans" },
  { key: "ledger", label: "Stock Ledger", description: "Stock movement ledger" },
  { key: "reports", label: "Reports", description: "Reports and analytics" },
  { key: "users", label: "Users", description: "User management" },
  { key: "vendors", label: "Vendors", description: "Vendor master" },
  { key: "settings", label: "Settings", description: "App configuration" },
  { key: "scrap", label: "Scrap", description: "Scrap management" },
] as const;

export type PermissionKey = (typeof PERMISSION_AREAS)[number]["key"];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, UserRole[]> = {
  dashboard: ["administrator", "store_manager", "production_user"],
  profiles: ["administrator", "store_manager", "production_user"],
  series: ["administrator", "store_manager", "production_user"],
  stock: ["administrator", "store_manager"],
  consumption: ["administrator", "store_manager", "production_user"],
  coating: ["administrator", "store_manager", "production_user"],
  challans: ["administrator", "store_manager"],
  reports: ["administrator", "store_manager"],
  users: ["administrator"],
  vendors: ["administrator", "store_manager", "production_user"],
  settings: ["administrator", "store_manager", "production_user"],
  scrap: ["administrator", "store_manager"],
  ledger: ["administrator", "store_manager"],
};

export type UserPermissionOverrides = Record<string, Record<string, boolean>>;

export function hasRolePermission(
  role: UserRole | undefined,
  required: UserRole[]
): boolean {
  if (!role) return false;
  if (role === "administrator") return true;
  return required.includes(role);
}

export function getRoleDefaultAccess(
  role: UserRole,
  permKey: string,
  rolePermissions: Record<string, UserRole[]>
): boolean {
  if (role === "administrator") return true;
  return (rolePermissions[permKey] ?? []).includes(role);
}

export function isPermissionEnabledForUser(
  user: Pick<User, "id" | "role">,
  permKey: string,
  rolePermissions: Record<string, UserRole[]>,
  overrides: UserPermissionOverrides
): boolean {
  if (user.role === "administrator") return true;

  const userOverride = overrides[user.id]?.[permKey];
  if (userOverride !== undefined) return userOverride;

  return getRoleDefaultAccess(user.role, permKey, rolePermissions);
}

export function canAccessModule(
  user: Pick<User, "id" | "role"> | undefined,
  permKey: string,
  rolePermissions: Record<string, UserRole[]>,
  overrides: UserPermissionOverrides
): boolean {
  if (!user) return false;
  return isPermissionEnabledForUser(user, permKey, rolePermissions, overrides);
}

export function toggleUserPermissionOverride(
  overrides: UserPermissionOverrides,
  userId: string,
  permKey: string,
  enabled: boolean,
  roleDefault: boolean
): UserPermissionOverrides {
  const next = { ...overrides };
  const userOverrides = { ...(next[userId] ?? {}) };

  if (enabled === roleDefault) {
    delete userOverrides[permKey];
    if (Object.keys(userOverrides).length === 0) {
      delete next[userId];
      return next;
    }
    next[userId] = userOverrides;
    return next;
  }

  next[userId] = { ...userOverrides, [permKey]: enabled };
  return next;
}

export function clearUserPermissionOverrides(
  overrides: UserPermissionOverrides,
  userId: string
): UserPermissionOverrides {
  if (!overrides[userId]) return overrides;
  const next = { ...overrides };
  delete next[userId];
  return next;
}

export function buildFullAccessOverrides(): Record<string, boolean> {
  return Object.fromEntries(PERMISSION_AREAS.map((area) => [area.key, true]));
}
