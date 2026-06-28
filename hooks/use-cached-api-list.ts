"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchJson } from "@/lib/fetch-json";
import { mergeListsByIdPreferLocal } from "@/lib/merge-lists";
import { readCachedApiList } from "@/hooks/use-seeded-list-state";

type ListResponse<K extends string, T> = Record<K, T[] | undefined>;

/** Hydrate list pages from JSON cache or store after mount; refresh in background. */
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

  const [apiItems, setApiItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useLayoutEffect(() => {
    const cached = readCachedApiList(url, listKey, mapItemRef.current);
    if (cached.length > 0) {
      setApiItems(cached);
      setIsLoading(false);
      return;
    }
    const storeItems = getStoreFallbackRef.current?.() ?? [];
    if (storeItems.length > 0) {
      setApiItems(
        mapItemRef.current ? storeItems.map(mapItemRef.current) : storeItems
      );
      setIsLoading(false);
      return;
    }
    if (hasSeedDataRef.current?.()) {
      setIsLoading(false);
    }
  }, [url, listKey]);

  useEffect(() => {
    let cancelled = false;

    fetchJson<ListResponse<K, T>>(url)
      .then((response) => {
        if (cancelled) return;
        const list = response?.[listKey] ?? [];
        const remote = mapItemRef.current ? list.map(mapItemRef.current) : list;
        const local = getStoreFallbackRef.current?.() ?? [];
        const merged =
          local.length > 0
            ? mergeListsByIdPreferLocal(
                remote as Array<T & { id: string }>,
                local as Array<T & { id: string }>
              )
            : remote;
        setApiItems(merged);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, listKey]);

  return { apiItems, setApiItems, isLoading };
}
