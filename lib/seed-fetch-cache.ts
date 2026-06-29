import { setJsonCacheEntry } from "@/lib/fetch-json";
import { useAppStore } from "@/lib/store";

/** Warm in-memory fetch cache from store after bootstrap. */
export function seedFetchCacheFromAppStore(
  state: ReturnType<typeof useAppStore.getState>
): void {
  setJsonCacheEntry("/api/profiles", { profiles: state.profiles ?? [] });
  setJsonCacheEntry("/api/series", { series: state.seriesNames ?? [] });
  setJsonCacheEntry("/api/stock", { inward: state.stockInward ?? [] });
  setJsonCacheEntry("/api/purchase-orders", {
    purchaseOrders: state.purchaseOrders ?? [],
  });
  setJsonCacheEntry("/api/challans", { challans: state.challans ?? [] });
  setJsonCacheEntry("/api/powder-coating", {
    powderCoating: state.powderCoating ?? [],
  });
  setJsonCacheEntry("/api/vendors", { vendors: state.vendors ?? [] });
  setJsonCacheEntry("/api/users", { users: state.users ?? [] });
}
