"use client";

import { useEffect } from "react";
import { fetchAppSettingsApi } from "@/lib/app-settings-api";
import { fetchJson } from "@/lib/fetch-json";
import { filterVisibleChallans } from "@/lib/challan-consumption";
import { normalizeProfile } from "@/lib/profile";
import { normalizeStockInwardRecord } from "@/lib/stock-inward-calculations";
import { normalizeModuleRolePermissions } from "@/lib/role-permissions";
import { enrichChallanVendorDetails } from "@/lib/vendor";
import { mergeUsersLists } from "@/lib/user-merge";
import { mergeVendorLists } from "@/lib/vendor-merge";
import { useAppStore } from "@/lib/store";
import { markBootstrapComplete } from "@/lib/bootstrap-state";
import { seedFetchCacheFromAppStore } from "@/lib/seed-fetch-cache";
import type {
  Challan,
  PowderCoating,
  Profile,
  PurchaseOrder,
  Report,
  SeriesName,
  StockInward,
  User,
  Vendor,
} from "@/types";

function listSignature<T>(items: T[] | undefined, getId: (item: T) => string): string {
  const list = items ?? [];
  if (list.length === 0) return "0";
  return `${list.length}:${getId(list[0])}:${getId(list[list.length - 1])}`;
}

function shouldRefreshStore(
  current: ReturnType<typeof useAppStore.getState>,
  next: {
    seriesNames: SeriesName[];
    profiles: Profile[];
    stockInward: StockInward[];
    purchaseOrders: PurchaseOrder[];
    challans: Challan[];
    powderCoating: PowderCoating[];
    vendors: Vendor[];
    users: User[];
    reports: Report[];
  }
): boolean {
  return (
    listSignature(current.seriesNames, (item) => item.id) !==
      listSignature(next.seriesNames, (item) => item.id) ||
    listSignature(current.profiles, (item) => item.id) !==
      listSignature(next.profiles, (item) => item.id) ||
    listSignature(current.stockInward, (item) => item.id) !==
      listSignature(next.stockInward, (item) => item.id) ||
    listSignature(current.purchaseOrders, (item) => item.id) !==
      listSignature(next.purchaseOrders, (item) => item.id) ||
    listSignature(current.challans, (item) => item.id) !==
      listSignature(next.challans, (item) => item.id) ||
    listSignature(current.powderCoating, (item) => item.id) !==
      listSignature(next.powderCoating, (item) => item.id) ||
    listSignature(current.vendors, (item) => item.id) !==
      listSignature(next.vendors, (item) => item.id) ||
    listSignature(current.users, (item) => item.id) !==
      listSignature(next.users, (item) => item.id) ||
    listSignature(current.reports, (item) => item.id) !==
      listSignature(next.reports, (item) => item.id)
  );
}

/** Load API data into the store on startup. Database is the source of truth for entity lists. */
export function StoreDataBootstrap() {
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const rehydratePromise = useAppStore.persist.hasHydrated()
          ? Promise.resolve()
          : useAppStore.persist.rehydrate();

        const [
          seriesResult,
          profilesResult,
          stockResult,
          purchaseOrdersResult,
          challansResult,
          powderCoatingResult,
          vendorsResult,
          usersResult,
          appSettingsResult,
        ] = await Promise.all([
          fetchJson<{ series?: SeriesName[] }>("/api/series"),
          fetchJson<{ profiles?: Profile[] }>("/api/profiles"),
          fetchJson<{ inward?: StockInward[] }>("/api/stock"),
          fetchJson<{ purchaseOrders?: PurchaseOrder[] }>("/api/purchase-orders"),
          fetchJson<{ challans?: Challan[] }>("/api/challans"),
          fetchJson<{ powderCoating?: PowderCoating[] }>("/api/powder-coating"),
          fetchJson<{ vendors?: Vendor[] }>("/api/vendors"),
          fetchJson<{ users?: User[] }>("/api/users"),
          fetchAppSettingsApi(),
          rehydratePromise,
        ]);

        if (cancelled) return;

        const mergedVendors = mergeVendorLists(vendorsResult.vendors ?? [], []);

        const next = {
          seriesNames: seriesResult.series ?? [],
          profiles: (profilesResult.profiles ?? []).map(normalizeProfile),
          stockInward: (stockResult.inward ?? []).map(normalizeStockInwardRecord),
          deletedStockInwardIds: [],
          consumption: [],
          purchaseOrders: purchaseOrdersResult.purchaseOrders ?? [],
          challans: filterVisibleChallans(
            (challansResult.challans ?? []).map((challan) =>
              enrichChallanVendorDetails(challan, mergedVendors)
            )
          ),
          powderCoating: powderCoatingResult.powderCoating ?? [],
          vendors: mergedVendors,
          users: mergeUsersLists(usersResult.users ?? [], []),
          reports: appSettingsResult.reports ?? [],
          navOrder: appSettingsResult.navOrder ?? null,
          hiddenNavHrefs: appSettingsResult.hiddenNavHrefs ?? [],
          rolePermissions: appSettingsResult.rolePermissions
            ? normalizeModuleRolePermissions(appSettingsResult.rolePermissions)
            : useAppStore.getState().rolePermissions,
          userPermissionOverrides: appSettingsResult.userPermissionOverrides ?? {},
          settings: appSettingsResult.settings ?? useAppStore.getState().settings,
        };

        const current = useAppStore.getState();
        if (shouldRefreshStore(current, next)) {
          useAppStore.setState(next);
        }
        seedFetchCacheFromAppStore(useAppStore.getState());
      } finally {
        if (!cancelled) {
          markBootstrapComplete();
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
