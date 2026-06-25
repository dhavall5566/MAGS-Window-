import { prefetchJson } from "@/lib/fetch-json";

export const APP_API_PATHS = [
  "/api/profiles",
  "/api/challans",
  "/api/purchase-orders",
  "/api/vendors",
  "/api/stock",
  "/api/consumption",
  "/api/powder-coating",
  "/api/scrap",
  "/api/dashboard",
  "/api/reports",
  "/api/users",
] as const;

export function prefetchAppData(): void {
  for (const path of APP_API_PATHS) {
    prefetchJson(path);
  }
}
