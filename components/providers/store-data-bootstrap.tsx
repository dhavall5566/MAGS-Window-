"use client";

import { useEffect } from "react";
import { prefetchAppData } from "@/lib/prefetch-app-data";
import { fetchJson } from "@/lib/fetch-json";
import { getManualConsumption } from "@/lib/challan-consumption";
import { normalizeProfile } from "@/lib/profile";
import { enrichChallanVendorDetails } from "@/lib/vendor";
import { useAppStore } from "@/lib/store";
import type {
  Challan,
  Consumption,
  PowderCoating,
  Profile,
  PurchaseOrder,
  Scrap,
  SeriesName,
  StockInward,
} from "@/types";

/** Prefetch API data after persist rehydrate; master and inventory sync from backend. */
export function StoreDataBootstrap() {
  useEffect(() => {
    prefetchAppData();

    let cancelled = false;

    const bootstrap = async () => {
      if (!useAppStore.persist.hasHydrated()) {
        await useAppStore.persist.rehydrate();
      }
      if (cancelled) return;

      const [
        seriesResult,
        profilesResult,
        stockResult,
        consumptionResult,
        purchaseOrdersResult,
        challansResult,
        powderCoatingResult,
        scrapResult,
      ] = await Promise.all([
        fetchJson<{ series?: SeriesName[] }>("/api/series"),
        fetchJson<{ profiles?: Profile[] }>("/api/profiles"),
        fetchJson<{ inward?: StockInward[] }>("/api/stock"),
        fetchJson<{ consumption?: Consumption[] }>("/api/consumption"),
        fetchJson<{ purchaseOrders?: PurchaseOrder[] }>("/api/purchase-orders"),
        fetchJson<{ challans?: Challan[] }>("/api/challans"),
        fetchJson<{ powderCoating?: PowderCoating[] }>("/api/powder-coating"),
        fetchJson<{ scrap?: Scrap[] }>("/api/scrap"),
      ]);

      if (cancelled) return;

      const vendors = useAppStore.getState().vendors ?? [];

      useAppStore.setState({
        seriesNames: seriesResult.series ?? [],
        profiles: (profilesResult.profiles ?? []).map(normalizeProfile),
        stockInward: stockResult.inward ?? [],
        deletedStockInwardIds: [],
        consumption: getManualConsumption(consumptionResult.consumption ?? []),
        purchaseOrders: purchaseOrdersResult.purchaseOrders ?? [],
        challans: (challansResult.challans ?? []).map((challan) =>
          enrichChallanVendorDetails(challan, vendors)
        ),
        powderCoating: powderCoatingResult.powderCoating ?? [],
        scrap: scrapResult.scrap ?? [],
      });
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
