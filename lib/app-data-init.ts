import { prefetchAppData } from "@/lib/prefetch-app-data";
import { seedFetchCacheFromAppStore } from "@/lib/seed-fetch-cache";
import { useAppStore } from "@/lib/store";

/** Prefetch APIs as soon as the client bundle loads. Store rehydrate runs after React hydration. */
if (typeof window !== "undefined") {
  useAppStore.persist.onFinishHydration((state) => {
    seedFetchCacheFromAppStore(state);
  });
  prefetchAppData();
}
