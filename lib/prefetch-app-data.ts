import { prefetchJson } from "@/lib/fetch-json";

/** API paths loaded during bootstrap — prefetch early so cache is warm before first navigation. */
export const APP_API_PATHS = [
  "/api/series",
  "/api/profiles",
  "/api/stock",
  "/api/purchase-orders",
  "/api/challans",
  "/api/powder-coating",
  "/api/vendors",
  "/api/users",
  "/api/app-settings",
  "/api/reports",
  "/api/notifications",
] as const;

export function prefetchAppData(): void {
  for (const path of APP_API_PATHS) {
    prefetchJson(path);
  }
}
