"use client";

import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { fetchJson, getCachedJson } from "@/lib/fetch-json";
import { isBootstrapComplete, onBootstrapComplete } from "@/lib/bootstrap-state";
import { useAppStore } from "@/lib/store";

type StoreState = ReturnType<typeof useAppStore.getState>;

function getListItemId<T>(item: T): string {
  if (item && typeof item === "object" && "id" in item) {
    return String((item as { id: unknown }).id);
  }
  return JSON.stringify(item);
}

function areListsEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (getListItemId(a[index]) !== getListItemId(b[index])) return false;
  }
  return true;
}

export function readCachedApiList<T, K extends string>(
  url: string,
  listKey: K,
  mapItem?: (item: T) => T
): T[] {
  if (typeof window === "undefined") return [];
  const raw = getCachedJson<Record<K, T[] | undefined>>(url)?.[listKey] ?? [];
  return mapItem ? raw.map(mapItem) : raw;
}

export function readCachedOrStoreList<T, K extends string>(
  url: string,
  listKey: K,
  storeSelector: (state: StoreState) => T[],
  mapItem?: (item: T) => T
): T[] {
  const cached = readCachedApiList(url, listKey, mapItem);
  if (cached.length > 0 || isBootstrapComplete()) return cached;

  const storeItems = storeSelector(useAppStore.getState()) ?? [];
  return mapItem ? storeItems.map(mapItem) : storeItems;
}

function hasCachedList<T, K extends string>(url: string, listKey: K): boolean {
  const cached = getCachedJson<Record<K, T[] | undefined>>(url);
  return cached != null && listKey in cached;
}

/** SSR-safe list state seeded from cache or store. Skips refetch when bootstrap warmed the cache. */
export function useCachedOrStoreList<T, K extends string>(
  url: string,
  listKey: K,
  storeSelector: (state: StoreState) => T[],
  mapItem?: (item: T) => T
): [T[], Dispatch<SetStateAction<T[]>>] {
  const storeSelectorRef = useRef(storeSelector);
  storeSelectorRef.current = storeSelector;
  const mapItemRef = useRef(mapItem);
  mapItemRef.current = mapItem;

  const readList = () =>
    readCachedOrStoreList(
      url,
      listKey,
      storeSelectorRef.current,
      mapItemRef.current
    );

  const [items, setItems] = useState<T[]>(() =>
    typeof window === "undefined" ? [] : readList()
  );

  useLayoutEffect(() => {
    const next = readList();
    setItems((prev) => (areListsEqual(prev, next) ? prev : next));
  }, [url, listKey]);

  useEffect(() => {
    const syncFromCacheOrStore = () => {
      const next = readList();
      setItems((prev) => (areListsEqual(prev, next) ? prev : next));
    };

    const unsubscribeBootstrap = onBootstrapComplete(syncFromCacheOrStore);
    if (isBootstrapComplete()) {
      syncFromCacheOrStore();
    }

    if (hasCachedList<T, K>(url, listKey) || isBootstrapComplete()) {
      syncFromCacheOrStore();
      return unsubscribeBootstrap;
    }

    let cancelled = false;

    void fetchJson<Record<K, T[] | undefined>>(url).then((data) => {
      if (cancelled) return;
      const mapper = mapItemRef.current;
      const remote = (data?.[listKey] ?? []).map((item) =>
        mapper ? mapper(item) : item
      );
      setItems((prev) => (areListsEqual(prev, remote) ? prev : remote));
    });

    return () => {
      cancelled = true;
      unsubscribeBootstrap();
    };
  }, [url, listKey]);

  return [items, setItems];
}
