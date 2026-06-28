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
  { key: "challans", label: "Challans", description: "Outward and powder coating challans" },
  { key: "ledger", label: "Stock Ledger", description: "Stock movement ledger" },
  { key: "reports", label: "Reports", description: "Reports and analytics" },
  { key: "users", label: "Users", description: "User management" },
  { key: "vendors", label: "Vendors", description: "Vendor master" },
  { key: "settings", label: "Settings", description: "App configuration" },
] as const;

export type PermissionKey = (typeof PERMISSION_AREAS)[number]["key"];

export type CrudAction = "create" | "read" | "update" | "delete";

export interface CrudPermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export type RoleCrudMatrix = Record<UserRole, CrudPermissions>;

export type ModuleRolePermissions = Record<string, RoleCrudMatrix>;

export type UserCrudOverrides = Record<string, Record<string, Partial<CrudPermissions>>>;

/** @deprecated Legacy boolean module toggles — migrated on load. */
export type UserPermissionOverrides = Record<string, Record<string, boolean>>;

export const CRUD_ACTIONS: CrudAction[] = ["create", "read", "update", "delete"];

export const CRUD_ACTION_LABELS: Record<CrudAction, string> = {
  create: "C",
  read: "R",
  update: "U",
  delete: "D",
};

export const CRUD_ACTION_TITLES: Record<CrudAction, string> = {
  create: "Create",
  read: "Read",
  update: "Update",
  delete: "Delete",
};

export const MANAGED_ROLES: UserRole[] = ["store_manager", "production_user"];

export const ALL_ROLES: UserRole[] = [
  "administrator",
  "store_manager",
  "production_user",
];

export const NO_CRUD: CrudPermissions = {
  create: false,
  read: false,
  update: false,
  delete: false,
};

export const FULL_CRUD: CrudPermissions = {
  create: true,
  read: true,
  update: true,
  delete: true,
};

/** Legacy role → module list (used to seed CRUD defaults). */
export const LEGACY_DEFAULT_ROLE_ACCESS: Record<string, UserRole[]> = {
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
  ledger: ["administrator", "store_manager"],
};

export const DEFAULT_ROLE_PERMISSIONS: ModuleRolePermissions =
  buildDefaultModuleRolePermissions();

function cloneCrud(permissions: CrudPermissions): CrudPermissions {
  return { ...permissions };
}

export function buildRoleCrudMatrixFromLegacy(allowedRoles: UserRole[]): RoleCrudMatrix {
  return {
    administrator: cloneCrud(FULL_CRUD),
    store_manager: allowedRoles.includes("store_manager")
      ? cloneCrud(FULL_CRUD)
      : cloneCrud(NO_CRUD),
    production_user: allowedRoles.includes("production_user")
      ? cloneCrud(FULL_CRUD)
      : cloneCrud(NO_CRUD),
  };
}

export function buildDefaultModuleRolePermissions(): ModuleRolePermissions {
  return Object.fromEntries(
    PERMISSION_AREAS.map((area) => [
      area.key,
      buildRoleCrudMatrixFromLegacy(LEGACY_DEFAULT_ROLE_ACCESS[area.key] ?? []),
    ])
  );
}

export function isLegacyRolePermissions(
  permissions: Record<string, unknown> | undefined
): permissions is Record<string, UserRole[]> {
  if (!permissions) return false;
  const first = Object.values(permissions)[0];
  return Array.isArray(first);
}

export function migrateRolePermissions(
  permissions: Record<string, unknown> | undefined
): ModuleRolePermissions {
  if (!permissions || isLegacyRolePermissions(permissions)) {
    const legacy = (permissions ?? LEGACY_DEFAULT_ROLE_ACCESS) as Record<string, UserRole[]>;
    return Object.fromEntries(
      PERMISSION_AREAS.map((area) => [
        area.key,
        buildRoleCrudMatrixFromLegacy(
          legacy[area.key] ?? LEGACY_DEFAULT_ROLE_ACCESS[area.key] ?? []
        ),
      ])
    );
  }
  return normalizeModuleRolePermissions(permissions as ModuleRolePermissions);
}

export function normalizeCrudPermissions(
  permissions: Partial<CrudPermissions> | undefined
): CrudPermissions {
  return {
    create: Boolean(permissions?.create),
    read: Boolean(permissions?.read),
    update: Boolean(permissions?.update),
    delete: Boolean(permissions?.delete),
  };
}

export function normalizeRoleCrudMatrix(
  matrix: Partial<RoleCrudMatrix> | undefined
): RoleCrudMatrix {
  return {
    administrator: normalizeCrudPermissions(matrix?.administrator ?? FULL_CRUD),
    store_manager: normalizeCrudPermissions(matrix?.store_manager),
    production_user: normalizeCrudPermissions(matrix?.production_user),
  };
}

export function normalizeModuleRolePermissions(
  permissions: Partial<ModuleRolePermissions> | undefined
): ModuleRolePermissions {
  const defaults = buildDefaultModuleRolePermissions();
  return Object.fromEntries(
    PERMISSION_AREAS.map((area) => [
      area.key,
      normalizeRoleCrudMatrix(permissions?.[area.key] ?? defaults[area.key]),
    ])
  ) as ModuleRolePermissions;
}

export function migrateUserPermissionOverrides(
  overrides:
    | UserPermissionOverrides
    | UserCrudOverrides
    | Record<string, Record<string, unknown>>
    | undefined
): UserCrudOverrides {
  if (!overrides) return {};
  const next: UserCrudOverrides = {};
  for (const [userId, moduleOverrides] of Object.entries(overrides)) {
    for (const [permKey, value] of Object.entries(moduleOverrides ?? {})) {
      if (typeof value === "boolean") {
        next[userId] = {
          ...(next[userId] ?? {}),
          [permKey]: value ? cloneCrud(FULL_CRUD) : cloneCrud(NO_CRUD),
        };
      } else if (value && typeof value === "object") {
        next[userId] = {
          ...(next[userId] ?? {}),
          [permKey]: { ...value },
        };
      }
    }
  }
  return next;
}

export function hasRolePermission(
  role: UserRole | undefined,
  required: UserRole[]
): boolean {
  if (!role) return false;
  if (role === "administrator") return true;
  return required.includes(role);
}

export function getRoleDefaultCrud(
  role: UserRole,
  permKey: string,
  rolePermissions: ModuleRolePermissions
): CrudPermissions {
  if (role === "administrator") return cloneCrud(FULL_CRUD);
  return normalizeCrudPermissions(rolePermissions[permKey]?.[role]);
}

export function getRoleDefaultAccess(
  role: UserRole,
  permKey: string,
  rolePermissions: ModuleRolePermissions
): boolean {
  return getRoleDefaultCrud(role, permKey, rolePermissions).read;
}

export function getEffectiveCrudForUser(
  user: Pick<User, "id" | "role">,
  permKey: string,
  rolePermissions: ModuleRolePermissions,
  overrides: UserCrudOverrides
): CrudPermissions {
  if (user.role === "administrator") return cloneCrud(FULL_CRUD);

  const roleDefault = getRoleDefaultCrud(user.role, permKey, rolePermissions);
  const userOverride = overrides[user.id]?.[permKey];
  if (!userOverride) return roleDefault;

  return normalizeCrudPermissions({ ...roleDefault, ...userOverride });
}

export function isPermissionEnabledForUser(
  user: Pick<User, "id" | "role">,
  permKey: string,
  rolePermissions: ModuleRolePermissions,
  overrides: UserCrudOverrides
): boolean {
  return getEffectiveCrudForUser(user, permKey, rolePermissions, overrides).read;
}

export function canAccessModule(
  user: Pick<User, "id" | "role"> | undefined,
  permKey: string,
  rolePermissions: ModuleRolePermissions,
  overrides: UserCrudOverrides
): boolean {
  if (!user) return false;
  return getEffectiveCrudForUser(user, permKey, rolePermissions, overrides).read;
}

export function canPerformCrudAction(
  user: Pick<User, "id" | "role"> | undefined,
  permKey: string,
  action: CrudAction,
  rolePermissions: ModuleRolePermissions,
  overrides: UserCrudOverrides
): boolean {
  if (!user) return false;
  return getEffectiveCrudForUser(user, permKey, rolePermissions, overrides)[action];
}

function crudEquals(a: CrudPermissions, b: CrudPermissions): boolean {
  return (
    a.create === b.create &&
    a.read === b.read &&
    a.update === b.update &&
    a.delete === b.delete
  );
}

export function setRoleCrudPermission(
  rolePermissions: ModuleRolePermissions,
  permKey: string,
  role: UserRole,
  action: CrudAction,
  enabled: boolean
): ModuleRolePermissions {
  if (role === "administrator") return rolePermissions;

  const current = normalizeModuleRolePermissions(rolePermissions);
  const matrix = normalizeRoleCrudMatrix(current[permKey]);
  const nextCrud = { ...matrix[role], [action]: enabled };

  if (!nextCrud.read) {
    nextCrud.create = false;
    nextCrud.update = false;
    nextCrud.delete = false;
  }

  return {
    ...current,
    [permKey]: {
      ...matrix,
      [role]: nextCrud,
    },
  };
}

export function setUserCrudOverride(
  overrides: UserCrudOverrides,
  userId: string,
  permKey: string,
  action: CrudAction,
  enabled: boolean,
  roleDefault: CrudPermissions
): UserCrudOverrides {
  const next = { ...overrides };
  const userOverrides = { ...(next[userId] ?? {}) };
  const current = normalizeCrudPermissions({
    ...roleDefault,
    ...userOverrides[permKey],
  });
  const updated = { ...current, [action]: enabled };

  if (!updated.read) {
    updated.create = false;
    updated.update = false;
    updated.delete = false;
  }

  if (crudEquals(updated, roleDefault)) {
    delete userOverrides[permKey];
  } else {
    userOverrides[permKey] = updated;
  }

  if (Object.keys(userOverrides).length === 0) {
    delete next[userId];
    return next;
  }

  next[userId] = userOverrides;
  return next;
}

export function clearUserPermissionOverrides(
  overrides: UserCrudOverrides,
  userId: string
): UserCrudOverrides {
  if (!overrides[userId]) return overrides;
  const next = { ...overrides };
  delete next[userId];
  return next;
}

export function buildFullAccessOverrides(): Record<string, CrudPermissions> {
  return Object.fromEntries(PERMISSION_AREAS.map((area) => [area.key, cloneCrud(FULL_CRUD)]));
}

export function countEnabledModulesForUser(
  user: Pick<User, "id" | "role">,
  rolePermissions: ModuleRolePermissions,
  overrides: UserCrudOverrides
): number {
  return PERMISSION_AREAS.filter((area) =>
    getEffectiveCrudForUser(user, area.key, rolePermissions, overrides).read
  ).length;
}

export function hasCustomUserOverrides(
  overrides: UserCrudOverrides,
  userId: string
): boolean {
  return Boolean(overrides[userId] && Object.keys(overrides[userId]).length > 0);
}

export function isUserCrudOverride(
  overrides: UserCrudOverrides,
  userId: string,
  permKey: string,
  roleDefault: CrudPermissions
): boolean {
  const override = overrides[userId]?.[permKey];
  if (!override) return false;
  return !crudEquals(normalizeCrudPermissions({ ...roleDefault, ...override }), roleDefault);
}
