import { UserRole } from "@prisma/client";

export type Permission =
  | "dashboard"
  | "profiles"
  | "gallery"
  | "stock-inward"
  | "consumption"
  | "powder-coating"
  | "scrap"
  | "ledger"
  | "reports"
  | "users"
  | "settings"
  | "challans";

const rolePermissions: Record<UserRole, Permission[]> = {
  ADMINISTRATOR: [
    "dashboard",
    "profiles",
    "gallery",
    "stock-inward",
    "consumption",
    "powder-coating",
    "scrap",
    "ledger",
    "reports",
    "users",
    "settings",
    "challans",
  ],
  STORE_MANAGER: [
    "dashboard",
    "profiles",
    "gallery",
    "stock-inward",
    "powder-coating",
    "reports",
    "ledger",
    "settings",
    "challans",
  ],
  PRODUCTION_USER: [
    "dashboard",
    "gallery",
    "consumption",
    "scrap",
    "ledger",
    "settings",
  ],
};

export function hasPermission(role: UserRole, permission: Permission) {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function getNavItems(role: UserRole) {
  const allItems = [
    { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", permission: "dashboard" as Permission },
    { href: "/profiles", label: "Profile Master", icon: "Package", permission: "profiles" as Permission },
    { href: "/gallery", label: "Profile Gallery", icon: "Images", permission: "gallery" as Permission },
    { href: "/stock-inward", label: "Stock Inward", icon: "ArrowDownToLine", permission: "stock-inward" as Permission },
    { href: "/consumption", label: "Consumption", icon: "Gauge", permission: "consumption" as Permission },
    { href: "/challans", label: "Challan Management", icon: "FileText", permission: "challans" as Permission },
    { href: "/powder-coating", label: "Powder Coating", icon: "Paintbrush", permission: "powder-coating" as Permission },
    { href: "/scrap", label: "Scrap & Waste", icon: "Trash2", permission: "scrap" as Permission },
    { href: "/ledger", label: "Stock Ledger", icon: "BookOpen", permission: "ledger" as Permission },
    { href: "/reports", label: "Reports", icon: "FileBarChart", permission: "reports" as Permission },
    { href: "/users", label: "User Management", icon: "Users", permission: "users" as Permission },
    { href: "/settings", label: "Settings", icon: "Settings", permission: "settings" as Permission },
  ];

  return allItems.filter((item) => hasPermission(role, item.permission));
}

export const roleLabels: Record<UserRole, string> = {
  ADMINISTRATOR: "Administrator",
  STORE_MANAGER: "Store Manager",
  PRODUCTION_USER: "Production User",
};
