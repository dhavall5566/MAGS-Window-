"use client";

import { startTransition, useEffect } from "react";
import { fetchAppSettingsApi } from "@/lib/app-settings-api";
import { fetchJson } from "@/lib/fetch-json";
import { filterVisibleChallans, getManualConsumption } from "@/lib/challan-consumption";
import { mergeListsByIdPreferLocal } from "@/lib/merge-lists";
import { normalizeProfile } from "@/lib/profile";
import { normalizeModuleRolePermissions } from "@/lib/role-permissions";
import { enrichChallanVendorDetails } from "@/lib/vendor";
import { mergeUsersLists } from "@/lib/user-merge";
import { mergeVendorLists } from "@/lib/vendor-merge";
import { useAppStore } from "@/lib/store";
import { seedFetchCacheFromAppStore } from "@/lib/seed-fetch-cache";
import type {
  Challan,
  Consumption,
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
    consumption: Consumption[];
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
    listSignature(current.consumption, (item) => item.id) !==
      listSignature(next.consumption, (item) => item.id) ||
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

/** Refresh API data in background; merge with local store so new records are not dropped. */
export function StoreDataBootstrap() {
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!useAppStore.persist.hasHydrated()) {
        await useAppStore.persist.rehydrate();
      }

      const current = useAppStore.getState();
      const deletedStockInwardIds = new Set(current.deletedStockInwardIds ?? []);

      const [
        seriesResult,
        profilesResult,
        stockResult,
        consumptionResult,
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
        fetchJson<{ consumption?: Consumption[] }>("/api/consumption"),
        fetchJson<{ purchaseOrders?: PurchaseOrder[] }>("/api/purchase-orders"),
        fetchJson<{ challans?: Challan[] }>("/api/challans"),
        fetchJson<{ powderCoating?: PowderCoating[] }>("/api/powder-coating"),
        fetchJson<{ vendors?: Vendor[] }>("/api/vendors"),
        fetchJson<{ users?: User[] }>("/api/users"),
        fetchAppSettingsApi(),
      ]);

      if (cancelled) return;

      const mergedVendors = mergeVendorLists(
        vendorsResult.vendors ?? [],
        current.vendors ?? []
      );

      const next = {
        seriesNames: mergeListsByIdPreferLocal(
          seriesResult.series ?? [],
          current.seriesNames ?? []
        ),
        profiles: mergeListsByIdPreferLocal(
          profilesResult.profiles ?? [],
          current.profiles ?? []
        ).map(normalizeProfile),
        stockInward: mergeListsByIdPreferLocal(
          stockResult.inward ?? [],
          current.stockInward ?? []
        ).filter((entry) => !deletedStockInwardIds.has(entry.id)),
        consumption: mergeListsByIdPreferLocal(
          getManualConsumption(consumptionResult.consumption ?? []),
          getManualConsumption(current.consumption ?? [])
        ),
        purchaseOrders: mergeListsByIdPreferLocal(
          purchaseOrdersResult.purchaseOrders ?? [],
          current.purchaseOrders ?? []
        ),
        challans: filterVisibleChallans(
          mergeListsByIdPreferLocal(
            challansResult.challans ?? [],
            current.challans ?? []
          ).map((challan) => enrichChallanVendorDetails(challan, mergedVendors))
        ),
        powderCoating: mergeListsByIdPreferLocal(
          powderCoatingResult.powderCoating ?? [],
          current.powderCoating ?? []
        ),
        vendors: mergedVendors,
        users: mergeUsersLists(usersResult.users ?? [], current.users ?? []),
        reports: mergeListsByIdPreferLocal(
          appSettingsResult.reports ?? [],
          current.reports ?? []
        ),
        navOrder: current.navOrder ?? appSettingsResult.navOrder ?? null,
        hiddenNavHrefs:
          current.hiddenNavHrefs?.length
            ? current.hiddenNavHrefs
            : (appSettingsResult.hiddenNavHrefs ?? []),
        rolePermissions: current.rolePermissions
          ? current.rolePermissions
          : appSettingsResult.rolePermissions
            ? normalizeModuleRolePermissions(appSettingsResult.rolePermissions)
            : current.rolePermissions,
        userPermissionOverrides:
          Object.keys(current.userPermissionOverrides ?? {}).length > 0
            ? current.userPermissionOverrides
            : (appSettingsResult.userPermissionOverrides ?? {}),
        settings: current.settings ?? appSettingsResult.settings ?? current.settings,
      };

      if (!shouldRefreshStore(current, next)) return;

      startTransition(() => {
        useAppStore.setState({
          ...next,
          deletedStockInwardIds: current.deletedStockInwardIds ?? [],
        });
        seedFetchCacheFromAppStore(useAppStore.getState());
      });
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
