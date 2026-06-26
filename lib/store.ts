"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile, SeriesName, Challan, StockInward, Consumption, PowderCoating, Scrap, Vendor, Report, UserRole, User, PurchaseOrder } from "@/types";
import { mockVendors } from "@/lib/mock-data/vendors";
import { mockUsers } from "@/lib/mock-data/users";
import { enrichChallanVendorDetails, normalizeVendor } from "@/lib/vendor";
import { getManualConsumption } from "@/lib/challan-consumption";
import { normalizeProfile } from "@/lib/profile";
import { DEFAULT_APP_SETTINGS, type AppSettings } from "@/lib/app-settings";
import {
  DEFAULT_ROLE_PERMISSIONS,
  buildFullAccessOverrides,
  type UserPermissionOverrides,
} from "@/lib/role-permissions";
import { normalizeStockInwardSupplier } from "@/lib/stock-inward-form";
import { normalizeStockInwardRecord } from "@/lib/stock-inward-calculations";
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
  rolePermissions: Record<string, UserRole[]>;
  userPermissionOverrides: UserPermissionOverrides;
  setProfiles: (profiles: Profile[]) => void;
  addProfile: (profile: Profile) => void;
  updateProfile: (id: string, updates: Partial<Profile>) => void;
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
      "partyName" | "partyAddress" | "personName" | "phoneNo" | "email" | "vendorType"
    >
  ) => void;
  deleteVendor: (id: string) => void;
  addUser: (user: User) => void;
  addReport: (report: Report) => void;
  deleteReport: (id: string) => void;
  addPurchaseOrder: (order: PurchaseOrder) => void;
  replacePurchaseOrder: (order: PurchaseOrder) => void;
  deletePurchaseOrder: (id: string) => void;
  setNavOrder: (order: string[]) => void;
  setHiddenNavHrefs: (hrefs: string[]) => void;
  resetNavOrder: () => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  setRolePermissions: (permissions: Record<string, UserRole[]>) => void;
  setUserPermissionOverrides: (overrides: UserPermissionOverrides) => void;
  resetRolePermissions: () => void;
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
      vendors: mockVendors.map(normalizeVendor),
      users: mockUsers,
      reports: [],
      purchaseOrders: [],
      navOrder: null,
      hiddenNavHrefs: [],
      settings: DEFAULT_APP_SETTINGS,
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
      userPermissionOverrides: {},
      setProfiles: (profiles) => set({ profiles }),
      addProfile: (profile) =>
        set((s) => ({
          profiles: [...(s.profiles ?? []), profile],
        })),
      updateProfile: (id, updates) =>
        set((s) => ({
          profiles: (s.profiles ?? []).map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
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
      addSeriesName: (series) =>
        set((s) => ({ seriesNames: [...(s.seriesNames ?? []), series] })),
      updateSeriesName: (id, updates) =>
        set((s) => ({
          seriesNames: (s.seriesNames ?? []).map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        })),
      deleteSeriesName: (id) =>
        set((s) => ({
          seriesNames: (s.seriesNames ?? []).filter((item) => item.id !== id),
        })),
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
      addChallan: (challan) =>
        set((s) => ({ challans: [...(s.challans ?? []), challan] })),
      updateChallan: (id, updates) =>
        set((s) => ({
          challans: (s.challans ?? []).map((c) =>
            c.id === id ? ({ ...c, ...updates } as Challan) : c
          ),
        })),
      replaceChallan: (challan) =>
        set((s) => {
          const exists = (s.challans ?? []).some((c) => c.id === challan.id);
          return {
            challans: exists
              ? (s.challans ?? []).map((c) => (c.id === challan.id ? challan : c))
              : [...(s.challans ?? []), challan],
          };
        }),
      deleteChallan: (id) =>
        set((s) => ({
          challans: (s.challans ?? []).filter((c) => c.id !== id),
        })),
      addStockInward: (entry) =>
        set((s) => ({ stockInward: [...(s.stockInward ?? []), entry] })),
      upsertStockInward: (entry) =>
        set((s) => {
          const list = s.stockInward ?? [];
          const exists = list.some((e) => e.id === entry.id);
          return {
            stockInward: exists
              ? list.map((e) => (e.id === entry.id ? entry : e))
              : [...list, entry],
          };
        }),
      deleteStockInward: (id) =>
        set((s) => ({
          stockInward: (s.stockInward ?? []).filter((entry) => entry.id !== id),
          deletedStockInwardIds: [...(s.deletedStockInwardIds ?? []), id],
        })),
      addConsumption: (entry) =>
        set((s) => ({ consumption: [...(s.consumption ?? []), entry] })),
      addPowderCoating: (entry) =>
        set((s) => ({ powderCoating: [...(s.powderCoating ?? []), entry] })),
      updatePowderCoating: (id, updates) =>
        set((s) => ({
          powderCoating: (s.powderCoating ?? []).map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      deletePowderCoating: (id) =>
        set((s) => ({
          powderCoating: (s.powderCoating ?? []).filter((p) => p.id !== id),
        })),
      addScrap: (entry) =>
        set((s) => ({ scrap: [...(s.scrap ?? []), entry] })),
      addVendor: (vendor) =>
        set((s) => ({ vendors: [...(s.vendors ?? []), vendor] })),
      updateVendor: (id, updates) =>
        set((s) => ({
          vendors: (s.vendors ?? []).map((vendor) =>
            vendor.id === id ? { ...vendor, ...updates } : vendor
          ),
        })),
      deleteVendor: (id) =>
        set((s) => ({
          vendors: (s.vendors ?? []).filter((vendor) => vendor.id !== id),
        })),
      addUser: (user) =>
        set((s) => ({
          users: [...(s.users ?? []), user],
          userPermissionOverrides: {
            ...(s.userPermissionOverrides ?? {}),
            [user.id]: buildFullAccessOverrides(),
          },
        })),
      addReport: (report) =>
        set((s) => ({ reports: [...(s.reports ?? []), report] })),
      deleteReport: (id) =>
        set((s) => ({
          reports: (s.reports ?? []).filter((report) => report.id !== id),
        })),
      addPurchaseOrder: (order) =>
        set((s) => ({ purchaseOrders: [...(s.purchaseOrders ?? []), order] })),
      replacePurchaseOrder: (order) =>
        set((s) => {
          const list = s.purchaseOrders ?? [];
          const exists = list.some((o) => o.id === order.id);
          return {
            purchaseOrders: exists
              ? list.map((o) => (o.id === order.id ? order : o))
              : [...list, order],
          };
        }),
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
      resetRolePermissions: () => set({ rolePermissions: DEFAULT_ROLE_PERMISSIONS }),
    }),
    {
      name: "mags-app-store",
      version: 49,
      skipHydration: true,
      migrate: (persisted, fromVersion) => {
        const state = persisted as AppState & {
          hiddenNavHrefs?: string[];
          seriesNames?: SeriesName[];
          navOrder?: string[] | null;
          rolePermissions?: Record<string, UserRole[]>;
          userPermissionOverrides?: UserPermissionOverrides;
        };
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
          : (rest.challans ?? []).map(normalizeChallan);
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
          rolePermissions: {
            ...DEFAULT_ROLE_PERMISSIONS,
            ...(rest.rolePermissions ?? {}),
            series:
              rest.rolePermissions?.series ?? DEFAULT_ROLE_PERMISSIONS.series,
          },
          userPermissionOverrides: rest.userPermissionOverrides ?? {},
        };
      },
    }
  )
);
