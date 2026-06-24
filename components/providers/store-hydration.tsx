"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";

/** Rehydrate persisted store after mount so SSR and first client render match. */
export function StoreHydration() {
  useEffect(() => {
    void useAppStore.persist.rehydrate();
  }, []);

  return null;
}
