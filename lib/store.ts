"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile, SeriesName, Challan, StockInward, Consumption, PowderCoating, Scrap, Vendor, Report, UserRole, User } from "@/types";
import { mockChallans } from "@/lib/mock-data/challans";
import { mockStockInward } from "@/lib/mock-data/stock";
import { mockConsumption } from "@/lib/mock-data/consumption";
import { mockPowderCoating } from "@/lib/mock-data/powder-coating";
import { mockScrap } from "@/lib/mock-data/scrap";
import { mockVendors } from "@/lib/mock-data/vendors";
import { mockUsers } from "@/lib/mock-data/users";
import { enrichChallanVendorDetails, normalizeVendor } from "@/lib/vendor";
import { consumptionEntriesFromChallans } from "@/lib/challan-consumption";
import { mockProfiles } from "@/lib/mock-data/profiles";
import {
  appendPriceHistory,
  buildInitialPriceHistory,
  coalesceProfileRecords,
  getProfileCodeValue,
  normalizeProfile,
} from "@/lib/profile";
import { DEFAULT_APP_SETTINGS, type AppSettings } from "@/lib/app-settings";
import {
  DEFAULT_ROLE_PERMISSIONS,
  buildFullAccessOverrides,
  type UserPermissionOverrides,
} from "@/lib/role-permissions";
import { normalizeStockInwardSupplier } from "@/lib/stock-inward-form";
import { normalizeStockInwardRecord } from "@/lib/stock-inward-calculations";
function syncConsumptionWithChallans(
  challans: Challan[],
  consumption: Consumption[]
): Consumption[] {
  const manual = (consumption ?? []).filter((entry) => !entry.challanId);
  return [...manual, ...consumptionEntriesFromChallans(challans)];
}

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
      challans: mockChallans,
      stockInward: mockStockInward,
      deletedStockInwardIds: [],
      consumption: syncConsumptionWithChallans(mockChallans, mockConsumption),
      powderCoating: mockPowderCoating,
      scrap: mockScrap,
      vendors: mockVendors.map(normalizeVendor),
      users: mockUsers,
      reports: [],
      navOrder: null,
      hiddenNavHrefs: [],
      settings: DEFAULT_APP_SETTINGS,
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
      userPermissionOverrides: {},
      setProfiles: (profiles) => set({ profiles }),
      addProfile: (profile) =>
        set((s) => ({
          profiles: [
            ...(s.profiles ?? []),
            {
              ...profile,
              perKgRate: profile.perKgRate ?? 0,
              priceHistory:
                profile.priceHistory?.length
                  ? profile.priceHistory
                  : buildInitialPriceHistory(profile.perKgRate ?? 0),
            },
          ],
        })),
      updateProfile: (id, updates) =>
        set((s) => ({
          profiles: (s.profiles ?? []).map((p) => {
            if (p.id !== id) return p;
            const rate = updates.rate ?? updates.perKgRate ?? p.rate ?? p.perKgRate ?? 0;
            const previousRate = p.rate ?? p.perKgRate ?? 0;
            const priceHistory =
              (updates.rate !== undefined || updates.perKgRate !== undefined) &&
              rate !== previousRate
                ? appendPriceHistory(p.priceHistory, previousRate, rate)
                : updates.priceHistory ?? p.priceHistory ?? [];
            return { ...p, ...updates, rate, perKgRate: rate, priceHistory };
          }),
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
        set((s) => {
          const challans = [...(s.challans ?? []), challan];
          return {
            challans,
            consumption: syncConsumptionWithChallans(challans, s.consumption ?? []),
          };
        }),
      updateChallan: (id, updates) =>
        set((s) => {
          const challans = (s.challans ?? []).map((c) =>
            c.id === id ? ({ ...c, ...updates } as Challan) : c
          );
          return {
            challans,
            consumption: syncConsumptionWithChallans(challans, s.consumption ?? []),
          };
        }),
      replaceChallan: (challan) =>
        set((s) => {
          const exists = (s.challans ?? []).some((c) => c.id === challan.id);
          const challans = exists
            ? (s.challans ?? []).map((c) => (c.id === challan.id ? challan : c))
            : [...(s.challans ?? []), challan];
          return {
            challans,
            consumption: syncConsumptionWithChallans(challans, s.consumption ?? []),
          };
        }),
      deleteChallan: (id) =>
        set((s) => {
          const challans = (s.challans ?? []).filter((c) => c.id !== id);
          return {
            challans,
            consumption: syncConsumptionWithChallans(challans, s.consumption ?? []),
          };
        }),
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
      version: 44,
      skipHydration: true,
      migrate: (persisted) => {
        const state = persisted as AppState & {
          hiddenNavHrefs?: string[];
          seriesNames?: SeriesName[];
          navOrder?: string[] | null;
          rolePermissions?: Record<string, UserRole[]>;
          userPermissionOverrides?: UserPermissionOverrides;
        };
        const { seriesNames: persistedSeriesNames, ...rest } = state;
        const seriesNames = persistedSeriesNames ?? [];
        const mockByCode = new Map(
          mockProfiles.map((profile) => [getProfileCodeValue(profile), profile])
        );
        const profiles = (rest.profiles ?? []).map((profile) => {
          const mock = mockByCode.get(getProfileCodeValue(profile));
          const merged = mock ? coalesceProfileRecords(mock, profile) : profile;
          return normalizeProfile(merged);
        });
        const mockVendorIds = new Set(mockVendors.map((vendor) => vendor.id));
        const userVendors = (rest.vendors ?? [])
          .filter((vendor) => !mockVendorIds.has(vendor.id))
          .map(normalizeVendor);
        const vendors = [...mockVendors.map(normalizeVendor), ...userVendors];
        const mockUserIds = new Set(mockUsers.map((user) => user.id));
        const customUsers = (rest.users ?? []).filter((user) => !mockUserIds.has(user.id));
        const users = [...mockUsers, ...customUsers];
        const mockPcIds = new Set(mockPowderCoating.map((entry) => entry.id));
        const userPowderCoating = (rest.powderCoating ?? [])
          .filter((entry) => !mockPcIds.has(entry.id))
          .map((entry) => {
            const { status: _status, ...rest } = entry as PowderCoating & {
              status?: string;
            };
            return rest;
          });
        const powderCoating = [...mockPowderCoating, ...userPowderCoating];
        const stripPowderCoatingChallanStatus = (challan: Challan): Challan => {
          if (challan.type !== "powder_coating") return challan;
          const { status: _status, ...rest } = challan as Challan & { status?: string };
          return rest as Challan;
        };
        const mockIds = new Set(mockChallans.map((challan) => challan.id));
        const userChallans = (rest.challans ?? [])
          .filter((challan) => !mockIds.has(challan.id))
          .map((challan) =>
            stripPowderCoatingChallanStatus(enrichChallanVendorDetails(challan, vendors))
          );
        const challans = [
          ...mockChallans.map((challan) =>
            stripPowderCoatingChallanStatus(enrichChallanVendorDetails(challan, vendors))
          ),
          ...userChallans,
        ];
        const mockInwardIds = new Set(mockStockInward.map((entry) => entry.id));
        const userStockInward = (rest.stockInward ?? [])
          .filter((entry) => !mockInwardIds.has(entry.id))
          .map((entry) =>
            normalizeStockInwardRecord({
              ...entry,
              supplier: normalizeStockInwardSupplier(entry.supplier),
              dyeCode: entry.dyeCode?.trim() ?? "",
            })
          );
        const stockInward = [
          ...mockStockInward.map(normalizeStockInwardRecord),
          ...userStockInward,
        ];
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
          consumption: syncConsumptionWithChallans(
            challans,
            rest.consumption ?? mockConsumption
          ),
          profiles,
          vendors,
          users,
          powderCoating,
          stockInward,
          deletedStockInwardIds: rest.deletedStockInwardIds ?? [],
          reports: rest.reports ?? [],
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
