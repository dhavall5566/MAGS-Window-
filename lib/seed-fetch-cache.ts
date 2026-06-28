import { setJsonCacheEntry } from "@/lib/fetch-json";
import { useAppStore } from "@/lib/store";

/** Warm in-memory (and session) fetch cache from persisted store after rehydrate. */
export function seedFetchCacheFromAppStore(
  state: ReturnType<typeof useAppStore.getState>
): void {
  if (state.profiles?.length) {
    setJsonCacheEntry("/api/profiles", { profiles: state.profiles });
  }
  if (state.seriesNames?.length) {
    setJsonCacheEntry("/api/series", { series: state.seriesNames });
  }
  if (state.stockInward?.length) {
    setJsonCacheEntry("/api/stock", { inward: state.stockInward });
  }
  if (state.consumption?.length) {
    setJsonCacheEntry("/api/consumption", { consumption: state.consumption });
  }
  if (state.purchaseOrders?.length) {
    setJsonCacheEntry("/api/purchase-orders", { purchaseOrders: state.purchaseOrders });
  }
  if (state.challans?.length) {
    setJsonCacheEntry("/api/challans", { challans: state.challans });
  }
  if (state.powderCoating?.length) {
    setJsonCacheEntry("/api/powder-coating", { powderCoating: state.powderCoating });
  }
  if (state.vendors?.length) {
    setJsonCacheEntry("/api/vendors", { vendors: state.vendors });
  }
  if (state.reports?.length) {
    setJsonCacheEntry("/api/reports", { reports: state.reports });
  }
}
