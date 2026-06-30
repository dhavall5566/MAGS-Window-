"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile, SeriesName, Challan, StockInward, Consumption, PowderCoating, Scrap, Vendor, Report, UserRole, User, PurchaseOrder } from "@/types";
import { mockVendors } from "@/lib/mock-data/vendors";
import { mockUsers } from "@/lib/mock-data/users";
import { enrichChallanVendorDetails, normalizeVendor } from "@/lib/vendor";
import {
  mergeVendorLists,
  prepareVendorList,
} from "@/lib/vendor-merge";
import { getManualConsumption, filterVisibleChallans } from "@/lib/challan-consumption";
import { normalizeProfile } from "@/lib/profile";
import { DEFAULT_APP_SETTINGS, type AppSettings } from "@/lib/app-settings";
import {
  DEFAULT_ROLE_PERMISSIONS,
  buildFullAccessOverrides,
  migrateRolePermissions,
  migrateUserPermissionOverrides,
  normalizeModuleRolePermissions,
  type ModuleRolePermissions,
  type UserCrudOverrides,
} from "@/lib/role-permissions";
import { normalizeStockInwardSupplier } from "@/lib/stock-inward-form";
import { normalizeStockInwardRecord } from "@/lib/stock-inward-calculations";
import { showAddedToast, showSavedToast, showDeletedToast } from "@/lib/toast";
interface AppState {
  profiles: Profile[];
  seriesNames: SeriesName[];
  challans: Challan[];
  stockInward: StockInward[];
  deletedStockInwardIds: string[];
  consumption: Consumption[];
  powderCoating: PowderCoating[];
  scrap: Scrap[];
  vendors: Vendor[];
  users: User[];
  reports: Report[];
  purchaseOrders: PurchaseOrder[];
  navOrder: string[] | null;
  hiddenNavHrefs: string[];
  settings: AppSettings;
  rolePermissions: ModuleRolePermissions;
  userPermissionOverrides: UserCrudOverrides;
  dismissedLiveAlertKeys: string[];
  setProfiles: (profiles: Profile[]) => void;
  addProfile: (profile: Profile) => void;
  updateProfile: (id: string, updates: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;
  toggleProfileStatus: (id: string) => void;
  addSeriesName: (series: SeriesName) => void;
  updateSeriesName: (id: string, updates: Partial<SeriesName>) => void;
  deleteSeriesName: (id: string) => void;
  toggleSeriesStatus: (id: string) => void;
  addChallan: (challan: Challan) => void;
  updateChallan: (id: string, updates: Partial<Challan>) => void;
  replaceChallan: (challan: Challan) => void;
  deleteChallan: (id: string) => void;
  addStockInward: (entry: StockInward) => void;
  upsertStockInward: (entry: StockInward) => void;
  revertStockInwardAdds: (ids: string[]) => void;
  deleteStockInward: (id: string) => void;
  addConsumption: (entry: Consumption) => void;
  addPowderCoating: (entry: PowderCoating) => void;
  updatePowderCoating: (id: string, updates: Partial<PowderCoating>) => void;
  deletePowderCoating: (id: string) => void;
  addScrap: (entry: Scrap) => void;
  addVendor: (vendor: Vendor) => void;
  updateVendor: (
    id: string,
    updates: Pick<
      Vendor,
      "partyName" | "partyAddress" | "personName" | "phoneNo" | "email" | "vendorType" | "gstNo"
    >
  ) => void;
  deleteVendor: (id: string) => void;
  upsertVendor: (vendor: Vendor) => void;
  setVendors: (vendors: Vendor[]) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  replaceUser: (user: User) => void;
  deleteUser: (id: string) => void;
  addReport: (report: Report) => void;
  deleteReport: (id: string) => void;
  addPurchaseOrder: (order: PurchaseOrder) => void;
  replacePurchaseOrder: (order: PurchaseOrder) => void;
  deletePurchaseOrder: (id: string) => void;
  setNavOrder: (order: string[] | null) => void;
  setHiddenNavHrefs: (hrefs: string[]) => void;
  resetNavOrder: () => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  setRolePermissions: (permissions: ModuleRolePermissions) => void;
  setUserPermissionOverrides: (overrides: UserCrudOverrides) => void;
  resetRolePermissions: () => void;
  dismissLiveAlert: (key: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      profiles: [],
      seriesNames: [],
      challans: [],
      stockInward: [],
      deletedStockInwardIds: [],
      consumption: [],
      powderCoating: [],
      scrap: [],
      vendors: prepareVendorList(mockVendors.map(normalizeVendor)),
      users: mockUsers,
      reports: [],
      purchaseOrders: [],
      navOrder: null,
      hiddenNavHrefs: [],
      settings: DEFAULT_APP_SETTINGS,
      rolePermissions: normalizeModuleRolePermissions(DEFAULT_ROLE_PERMISSIONS),
      userPermissionOverrides: {},
      dismissedLiveAlertKeys: [],
      setProfiles: (profiles) => set({ profiles }),
      addProfile: (profile) => {
        set((s) => ({
          profiles: [...(s.profiles ?? []), profile],
        }));
        showAddedToast("Profile");
      },
      updateProfile: (id, updates) => {
        set((s) => ({
          profiles: (s.profiles ?? []).map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
        showSavedToast("Profile");
      },
      deleteProfile: (id) => {
        set((s) => ({
          profiles: (s.profiles ?? []).filter((p) => p.id !== id),
        }));
        showDeletedToast("Profile");
      },
      toggleProfileStatus: (id) =>
        set((s) => ({
          profiles: (s.profiles ?? []).map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: p.status === "active" ? "inactive" : "active",
                }
              : p
          ),
        })),
      addSeriesName: (series) => {
        set((s) => ({ seriesNames: [...(s.seriesNames ?? []), series] }));
        showAddedToast("Series");
      },
      updateSeriesName: (id, updates) => {
        set((s) => ({
          seriesNames: (s.seriesNames ?? []).map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
        showSavedToast("Series");
      },
      deleteSeriesName: (id) => {
        set((s) => ({
          seriesNames: (s.seriesNames ?? []).filter((item) => item.id !== id),
        }));
        showDeletedToast("Series");
      },
      toggleSeriesStatus: (id) =>
        set((s) => ({
          seriesNames: (s.seriesNames ?? []).map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: item.status === "active" ? "inactive" : "active",
                }
              : item
          ),
        })),
      addChallan: (challan) => {
        if (challan.type === "return") return;
        set((s) => ({ challans: [...(s.challans ?? []), challan] }));
        showAddedToast("Challan");
      },
      updateChallan: (id, updates) => {
        set((s) => ({
          challans: (s.challans ?? []).map((c) =>
            c.id === id ? ({ ...c, ...updates } as Challan) : c
          ),
        }));
        showSavedToast("Challan");
      },
      replaceChallan: (challan) => {
        if (challan.type === "return") return;
        const exists = (useAppStore.getState().challans ?? []).some((c) => c.id === challan.id);
        set((s) => {
          const hasChallan = (s.challans ?? []).some((c) => c.id === challan.id);
          return {
            challans: hasChallan
              ? (s.challans ?? []).map((c) => (c.id === challan.id ? challan : c))
              : [...(s.challans ?? []), challan],
          };
        });
        if (exists) showSavedToast("Challan");
        else showAddedToast("Challan");
      },
      deleteChallan: (id) => {
        set((s) => ({
          challans: (s.challans ?? []).filter((c) => c.id !== id),
        }));
        showDeletedToast("Challan");
      },
      addStockInward: (entry) => {
        set((s) => ({ stockInward: [...(s.stockInward ?? []), entry] }));
      },
      upsertStockInward: (entry) => {
        set((s) => {
          const list = s.stockInward ?? [];
          const hasEntry = list.some((e) => e.id === entry.id);
          return {
            stockInward: hasEntry
              ? list.map((e) => (e.id === entry.id ? entry : e))
              : [...list, entry],
          };
        });
      },
      revertStockInwardAdds: (ids) => {
        if (ids.length === 0) return;
        const idSet = new Set(ids);
        set((s) => ({
          stockInward: (s.stockInward ?? []).filter((entry) => !idSet.has(entry.id)),
        }));
      },
      deleteStockInward: (id) => {
        set((s) => ({
          stockInward: (s.stockInward ?? []).filter((entry) => entry.id !== id),
          deletedStockInwardIds: [...(s.deletedStockInwardIds ?? []), id],
        }));
        showDeletedToast("Stock inward");
      },
      addConsumption: (entry) => {
        set((s) => ({ consumption: [...(s.consumption ?? []), entry] }));
        showAddedToast("Consumption");
      },
      addPowderCoating: (entry) => {
        set((s) => ({ powderCoating: [...(s.powderCoating ?? []), entry] }));
        showAddedToast("Powder coating");
      },
      updatePowderCoating: (id, updates) => {
        set((s) => ({
          powderCoating: (s.powderCoating ?? []).map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
        showSavedToast("Powder coating");
      },
      deletePowderCoating: (id) => {
        set((s) => ({
          powderCoating: (s.powderCoating ?? []).filter((p) => p.id !== id),
        }));
        showDeletedToast("Powder coating");
      },
      addScrap: (entry) => {
        set((s) => ({ scrap: [...(s.scrap ?? []), entry] }));
        showAddedToast("Scrap entry");
      },
      addVendor: (vendor) => {
        set((s) => ({
          vendors: prepareVendorList([
            ...(s.vendors ?? []),
            normalizeVendor(vendor),
          ]),
        }));
      },
      updateVendor: (id, updates) => {
        set((s) => ({
          vendors: prepareVendorList(
            (s.vendors ?? []).map((vendor) =>
              vendor.id === id ? normalizeVendor({ ...vendor, ...updates }) : vendor
            )
          ),
        }));
      },
      deleteVendor: (id) => {
        set((s) => ({
          vendors: prepareVendorList(
            (s.vendors ?? []).filter((vendor) => vendor.id !== id)
          ),
        }));
      },
      upsertVendor: (vendor) => {
        set((s) => {
          const list = s.vendors ?? [];
          const normalized = normalizeVendor(vendor);
          const hasVendor = list.some((item) => item.id === normalized.id);
          const next = hasVendor
            ? list.map((item) => (item.id === normalized.id ? normalized : item))
            : [...list, normalized];
          return {
            vendors: prepareVendorList(next),
          };
        });
      },
      setVendors: (vendors) =>
        set({ vendors: prepareVendorList(vendors.map(normalizeVendor)) }),
      addUser: (user) => {
        set((s) => ({
          users: [...(s.users ?? []), user],
          userPermissionOverrides: {
            ...(s.userPermissionOverrides ?? {}),
            [user.id]: buildFullAccessOverrides(),
          },
        }));
        showAddedToast("User");
      },
      updateUser: (id, updates) => {
        set((s) => ({
          users: (s.users ?? []).map((user) =>
            user.id === id ? { ...user, ...updates } : user
          ),
        }));
      },
      replaceUser: (user) => {
        set((s) => ({
          users: (s.users ?? []).map((entry) => (entry.id === user.id ? user : entry)),
        }));
      },
      deleteUser: (id) => {
        set((s) => {
          const nextOverrides = { ...(s.userPermissionOverrides ?? {}) };
          delete nextOverrides[id];
          return {
            users: (s.users ?? []).filter((user) => user.id !== id),
            userPermissionOverrides: nextOverrides,
          };
        });
      },
      addReport: (report) => {
        set((s) => ({ reports: [...(s.reports ?? []), report] }));
        showAddedToast("Report");
      },
      deleteReport: (id) => {
        set((s) => ({
          reports: (s.reports ?? []).filter((report) => report.id !== id),
        }));
        showDeletedToast("Report");
      },
      addPurchaseOrder: (order) => {
        set((s) => ({ purchaseOrders: [...(s.purchaseOrders ?? []), order] }));
      },
      replacePurchaseOrder: (order) => {
        set((s) => {
          const list = s.purchaseOrders ?? [];
          const hasOrder = list.some((o) => o.id === order.id);
          return {
            purchaseOrders: hasOrder
              ? list.map((o) => (o.id === order.id ? order : o))
              : [...list, order],
          };
        });
      },
      deletePurchaseOrder: (id) =>
        set((s) => ({
          purchaseOrders: (s.purchaseOrders ?? []).filter((o) => o.id !== id),
        })),
      setNavOrder: (order) => set({ navOrder: order }),
      setHiddenNavHrefs: (hrefs) => set({ hiddenNavHrefs: hrefs }),
      resetNavOrder: () => set({ navOrder: null, hiddenNavHrefs: [] }),
      updateSettings: (updates) =>
        set((s) => ({
          settings: { ...DEFAULT_APP_SETTINGS, ...s.settings, ...updates },
        })),
      setRolePermissions: (permissions) => set({ rolePermissions: permissions }),
      setUserPermissionOverrides: (overrides) =>
        set({ userPermissionOverrides: overrides }),
      resetRolePermissions: () =>
        set({ rolePermissions: normalizeModuleRolePermissions(DEFAULT_ROLE_PERMISSIONS) }),
      dismissLiveAlert: (key) =>
        set((state) => {
          const current = state.dismissedLiveAlertKeys ?? [];
          if (current.includes(key)) return state;
          return { dismissedLiveAlertKeys: [...current, key] };
        }),
    }),
    {
      name: "mags-app-store",
      version: 56,
      skipHydration: true,
      partialize: (state) => ({
        navOrder: state.navOrder,
        hiddenNavHrefs: state.hiddenNavHrefs,
        settings: state.settings,
        rolePermissions: state.rolePermissions,
        userPermissionOverrides: state.userPermissionOverrides,
        dismissedLiveAlertKeys: state.dismissedLiveAlertKeys,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<AppState>;
        return {
          ...current,
          navOrder: saved.navOrder ?? current.navOrder,
          hiddenNavHrefs: saved.hiddenNavHrefs ?? current.hiddenNavHrefs,
          settings: {
            ...DEFAULT_APP_SETTINGS,
            ...current.settings,
            ...(saved.settings ?? {}),
          },
          rolePermissions: normalizeModuleRolePermissions(
            migrateRolePermissions(
              (saved.rolePermissions as Record<string, unknown> | undefined) ??
                current.rolePermissions
            )
          ),
          userPermissionOverrides: migrateUserPermissionOverrides(
            saved.userPermissionOverrides ?? current.userPermissionOverrides
          ),
          dismissedLiveAlertKeys:
            saved.dismissedLiveAlertKeys ?? current.dismissedLiveAlertKeys ?? [],
        };
      },
      migrate: (persisted, fromVersion) => {
        const state = persisted as AppState & {
          hiddenNavHrefs?: string[];
          seriesNames?: SeriesName[];
          navOrder?: string[] | null;
          rolePermissions?: Record<string, unknown>;
          userPermissionOverrides?: Record<string, Record<string, unknown>>;
        };

        const migratedRolePermissions = normalizeModuleRolePermissions(
          migrateRolePermissions(state.rolePermissions)
        );
        const migratedUserOverrides = migrateUserPermissionOverrides(
          state.userPermissionOverrides
        );

        if (fromVersion === 55) {
          return {
            ...state,
            dismissedLiveAlertKeys: state.dismissedLiveAlertKeys ?? [],
            rolePermissions: migratedRolePermissions,
            userPermissionOverrides: migratedUserOverrides,
          };
        }

        if (fromVersion === 54) {
          return {
            ...state,
            profiles: [],
            seriesNames: [],
            challans: [],
            stockInward: [],
            deletedStockInwardIds: [],
            consumption: [],
            powderCoating: [],
            scrap: [],
            purchaseOrders: [],
            reports: [],
            vendors: prepareVendorList(mockVendors.map(normalizeVendor)),
            users: mockUsers,
            dismissedLiveAlertKeys: [],
            rolePermissions: migratedRolePermissions,
            userPermissionOverrides: migratedUserOverrides,
          };
        }

        if (fromVersion === 53) {
          return {
            ...state,
            challans: [],
            dismissedLiveAlertKeys: state.dismissedLiveAlertKeys ?? [],
            rolePermissions: migratedRolePermissions,
            userPermissionOverrides: migratedUserOverrides,
          };
        }

        if (fromVersion === 52) {
          return {
            ...state,
            vendors: mergeVendorLists([], state.vendors ?? []),
            dismissedLiveAlertKeys: state.dismissedLiveAlertKeys ?? [],
            rolePermissions: migratedRolePermissions,
            userPermissionOverrides: migratedUserOverrides,
          };
        }

        if (fromVersion >= 51) {
          const mockVendorIds = new Set(mockVendors.map((vendor) => vendor.id));
          const userVendors = (state.vendors ?? [])
            .filter((vendor) => !mockVendorIds.has(vendor.id))
            .map(normalizeVendor);
          const vendors = [...mockVendors.map(normalizeVendor), ...userVendors];
          const mockUserIds = new Set(mockUsers.map((user) => user.id));
          const customUsers = (state.users ?? []).filter((user) => !mockUserIds.has(user.id));
          const users = [...mockUsers, ...customUsers];
          return {
            profiles: [],
            seriesNames: state.seriesNames ?? [],
            challans: [],
            stockInward: [],
            deletedStockInwardIds: [],
            consumption: [],
            powderCoating: [],
            scrap: [],
            reports: [],
            purchaseOrders: [],
            vendors,
            users,
            navOrder: state.navOrder ?? null,
            hiddenNavHrefs: state.hiddenNavHrefs ?? [],
            settings: {
              ...DEFAULT_APP_SETTINGS,
              ...(state.settings ?? {}),
            },
            rolePermissions: migratedRolePermissions,
            userPermissionOverrides: migratedUserOverrides,
            dismissedLiveAlertKeys: state.dismissedLiveAlertKeys ?? [],
          };
        }

        if (fromVersion >= 50) {
          const mockVendorIds = new Set(mockVendors.map((vendor) => vendor.id));
          const userVendors = (state.vendors ?? [])
            .filter((vendor) => !mockVendorIds.has(vendor.id))
            .map(normalizeVendor);
          const vendors = [...mockVendors.map(normalizeVendor), ...userVendors];
          const mockUserIds = new Set(mockUsers.map((user) => user.id));
          const customUsers = (state.users ?? []).filter((user) => !mockUserIds.has(user.id));
          const users = [...mockUsers, ...customUsers];
          return {
            profiles: [],
            seriesNames: state.seriesNames ?? [],
            challans: [],
            stockInward: [],
            deletedStockInwardIds: [],
            consumption: [],
            powderCoating: [],
            scrap: [],
            reports: [],
            purchaseOrders: [],
            vendors,
            users,
            navOrder: state.navOrder ?? null,
            hiddenNavHrefs: state.hiddenNavHrefs ?? [],
            settings: {
              ...DEFAULT_APP_SETTINGS,
              ...(state.settings ?? {}),
            },
            rolePermissions: migratedRolePermissions,
            userPermissionOverrides: migratedUserOverrides,
            dismissedLiveAlertKeys: state.dismissedLiveAlertKeys ?? [],
          };
        }

        const { seriesNames: persistedSeriesNames, ...rest } = state;
        const clearedMaster = fromVersion < 46;
        const clearedInventory = fromVersion < 47;
        const clearedConsumption = fromVersion < 48;
        const clearedOperations = fromVersion < 49;
        const seriesNames = clearedMaster ? [] : (persistedSeriesNames ?? []);
        const profiles = clearedMaster
          ? []
          : (rest.profiles ?? []).map((profile) => normalizeProfile(profile));
        const mockVendorIds = new Set(mockVendors.map((vendor) => vendor.id));
        const userVendors = (rest.vendors ?? [])
          .filter((vendor) => !mockVendorIds.has(vendor.id))
          .map(normalizeVendor);
        const vendors = [...mockVendors.map(normalizeVendor), ...userVendors];
        const mockUserIds = new Set(mockUsers.map((user) => user.id));
        const customUsers = (rest.users ?? []).filter((user) => !mockUserIds.has(user.id));
        const users = [...mockUsers, ...customUsers];
        const stripPowderCoatingChallanStatus = (challan: Challan): Challan => {
          if (challan.type !== "powder_coating") return challan;
          const { status: _status, ...restChallan } = challan as Challan & { status?: string };
          return restChallan as Challan;
        };
        const normalizeChallan = (challan: Challan) =>
          stripPowderCoatingChallanStatus(enrichChallanVendorDetails(challan, vendors));
        const challans = clearedOperations
          ? []
          : filterVisibleChallans((rest.challans ?? []).map(normalizeChallan));
        const powderCoating = clearedOperations
          ? []
          : (rest.powderCoating ?? []).map((entry) => {
              const { status: _status, ...clean } = entry as PowderCoating & {
                status?: string;
              };
              return clean;
            });
        const scrap = clearedOperations ? [] : (rest.scrap ?? []);
        const stockInward = clearedInventory
          ? []
          : (rest.stockInward ?? []).map((entry) =>
              normalizeStockInwardRecord({
                ...entry,
                supplier: normalizeStockInwardSupplier(entry.supplier),
                dyeCode: entry.dyeCode?.trim() ?? "",
              })
            );
        const consumption = clearedConsumption
          ? []
          : getManualConsumption(rest.consumption ?? []);
        return {
          ...rest,
          seriesNames,
          navOrder: rest.navOrder ?? null,
          hiddenNavHrefs: rest.hiddenNavHrefs ?? [],
          settings: {
            ...DEFAULT_APP_SETTINGS,
            ...(rest.settings ?? {}),
          },
          challans,
          consumption,
          profiles,
          vendors,
          users,
          powderCoating,
          scrap,
          stockInward,
          deletedStockInwardIds: clearedInventory ? [] : (rest.deletedStockInwardIds ?? []),
          reports: rest.reports ?? [],
          purchaseOrders: clearedInventory ? [] : (rest.purchaseOrders ?? []),
          rolePermissions: migratedRolePermissions,
          userPermissionOverrides: migratedUserOverrides,
          dismissedLiveAlertKeys: rest.dismissedLiveAlertKeys ?? [],
        };
      },
    }
  )
);
