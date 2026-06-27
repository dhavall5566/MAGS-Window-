"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

/** Rehydrate persisted store after React hydration to avoid SSR/client markup mismatches. */
export function StoreHydration() {
  useEffect(() => {
    void useAppStore.persist.rehydrate();
  }, []);

  return null;
}
