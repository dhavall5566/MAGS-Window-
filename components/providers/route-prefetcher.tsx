"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onBootstrapComplete } from "@/lib/bootstrap-state";
import { defaultNavItems } from "@/lib/nav-items";

/** Prefetch all app route JS chunks once bootstrap finishes so first tab clicks are instant. */
export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    const prefetchAll = () => {
      for (const item of defaultNavItems) {
        if (item.hiddenFromNav) continue;
        router.prefetch(item.href);
      }
    };

    prefetchAll();
    return onBootstrapComplete(prefetchAll);
  }, [router]);

  return null;
}
