"use client";

import { startTransition, useEffect } from "react";
import { fetchJson } from "@/lib/fetch-json";
import { filterVisibleChallans, getManualConsumption } from "@/lib/challan-consumption";
import { normalizeProfile } from "@/lib/profile";
import { enrichChallanVendorDetails } from "@/lib/vendor";
import { useAppStore } from "@/lib/store";
import { seedFetchCacheFromAppStore } from "@/lib/seed-fetch-cache";
import type {
  Challan,
  Consumption,
  PowderCoating,
  Profile,
  PurchaseOrder,
  SeriesName,
  StockInward,
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
      listSignature(next.powderCoating, (item) => item.id)
  );
}

/** Refresh API data in background; persisted store + session cache show content immediately. */
export function StoreDataBootstrap() {
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!useAppStore.persist.hasHydrated()) {
        await useAppStore.persist.rehydrate();
      }

      const [
        seriesResult,
        profilesResult,
        stockResult,
        consumptionResult,
        purchaseOrdersResult,
        challansResult,
        powderCoatingResult,
      ] = await Promise.all([
        fetchJson<{ series?: SeriesName[] }>("/api/series"),
        fetchJson<{ profiles?: Profile[] }>("/api/profiles"),
        fetchJson<{ inward?: StockInward[] }>("/api/stock"),
        fetchJson<{ consumption?: Consumption[] }>("/api/consumption"),
        fetchJson<{ purchaseOrders?: PurchaseOrder[] }>("/api/purchase-orders"),
        fetchJson<{ challans?: Challan[] }>("/api/challans"),
        fetchJson<{ powderCoating?: PowderCoating[] }>("/api/powder-coating"),
      ]);

      if (cancelled) return;

      const vendors = useAppStore.getState().vendors ?? [];
      const next = {
        seriesNames: seriesResult.series ?? [],
        profiles: (profilesResult.profiles ?? []).map(normalizeProfile),
        stockInward: stockResult.inward ?? [],
        consumption: getManualConsumption(consumptionResult.consumption ?? []),
        purchaseOrders: purchaseOrdersResult.purchaseOrders ?? [],
        challans: filterVisibleChallans(
          (challansResult.challans ?? []).map((challan) =>
            enrichChallanVendorDetails(challan, vendors)
          )
        ),
        powderCoating: powderCoatingResult.powderCoating ?? [],
      };

      const current = useAppStore.getState();
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
