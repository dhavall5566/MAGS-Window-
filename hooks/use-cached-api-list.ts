"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchJson, getCachedJson } from "@/lib/fetch-json";
import { isBootstrapComplete, onBootstrapComplete } from "@/lib/bootstrap-state";
import { readCachedApiList } from "@/hooks/use-seeded-list-state";

type ListResponse<K extends string, T> = Record<K, T[] | undefined>;

function hasCachedList<T, K extends string>(url: string, listKey: K): boolean {
  const cached = getCachedJson<ListResponse<K, T>>(url);
  return cached != null && listKey in cached;
}

/** Hydrate list pages from JSON cache or store. Skips refetch when bootstrap warmed the cache. */
export function useCachedApiList<T, K extends string>(
  url: string,
  listKey: K,
  options?: {
    mapItem?: (item: T) => T;
    hasSeedData?: () => boolean;
    getStoreFallback?: () => T[];
  }
) {
  const mapItem = options?.mapItem;
  const hasSeedData = options?.hasSeedData;
  const getStoreFallback = options?.getStoreFallback;
  const getStoreFallbackRef = useRef(getStoreFallback);
  const hasSeedDataRef = useRef(hasSeedData);
  const mapItemRef = useRef(mapItem);
  getStoreFallbackRef.current = getStoreFallback;
  hasSeedDataRef.current = hasSeedData;
  mapItemRef.current = mapItem;

  const readInitial = () => {
    const cached = readCachedApiList(url, listKey, mapItemRef.current);
    if (cached.length > 0 || isBootstrapComplete()) return cached;
    const storeItems = getStoreFallbackRef.current?.() ?? [];
    return mapItemRef.current ? storeItems.map(mapItemRef.current) : storeItems;
  };

  const [apiItems, setApiItems] = useState<T[]>(() =>
    typeof window === "undefined" ? [] : readInitial()
  );
  const [isLoading, setIsLoading] = useState(
    () => typeof window !== "undefined" && readInitial().length === 0 && !isBootstrapComplete()
  );

  useLayoutEffect(() => {
    const next = readInitial();
    setApiItems(next);
    if (next.length > 0 || isBootstrapComplete() || hasSeedDataRef.current?.()) {
      setIsLoading(false);
    }
  }, [url, listKey]);

  useEffect(() => {
    const sync = () => {
      const next = readInitial();
      setApiItems(next);
      setIsLoading(false);
    };

    const unsubscribeBootstrap = onBootstrapComplete(sync);
    if (isBootstrapComplete() || hasCachedList<T, K>(url, listKey)) {
      sync();
      return unsubscribeBootstrap;
    }

    let cancelled = false;

    fetchJson<ListResponse<K, T>>(url)
      .then((response) => {
        if (cancelled) return;
        const list = response?.[listKey] ?? [];
        const remote = mapItemRef.current ? list.map(mapItemRef.current) : list;
        setApiItems(remote);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribeBootstrap();
    };
  }, [url, listKey]);

  return { apiItems, setApiItems, isLoading };
}
