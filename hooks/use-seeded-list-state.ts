"use client";

import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { fetchJson, getCachedJson } from "@/lib/fetch-json";
import { mergeChallans } from "@/lib/challan-consumption";
import { mergeListsByIdPreferLocal } from "@/lib/merge-lists";
import { useAppStore } from "@/lib/store";
import type { Challan } from "@/types";

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
  if (cached.length > 0) return cached;
  const storeItems = storeSelector(useAppStore.getState()) ?? [];
  return mapItem ? storeItems.map(mapItem) : storeItems;
}

/** SSR-safe list state seeded from session cache or persisted store before paint. */
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

  const [items, setItems] = useState<T[]>([]);

  useLayoutEffect(() => {
    setItems(
      readCachedOrStoreList(
        url,
        listKey,
        storeSelectorRef.current,
        mapItemRef.current
      )
    );
  }, [url, listKey]);

  useEffect(() => {
    let cancelled = false;

    void fetchJson<Record<K, T[] | undefined>>(url).then((data) => {
      if (cancelled) return;
      const mapper = mapItemRef.current;
      const remote = (data?.[listKey] ?? []).map((item) =>
        mapper ? mapper(item) : item
      );
      const local = storeSelectorRef.current(useAppStore.getState()) ?? [];
      let next: T[] = remote;
      if (url === "/api/challans" && listKey === "challans") {
        next = mergeChallans(
          remote as Challan[],
          local as Challan[]
        ) as T[];
      } else if (local.length > 0) {
        next = mergeListsByIdPreferLocal(
          remote as Array<T & { id: string }>,
          local as Array<T & { id: string }>
        );
      }
      setItems((prev) => (areListsEqual(prev, next) ? prev : next));
    });

    return () => {
      cancelled = true;
    };
  }, [url, listKey]);

  return [items, setItems];
}
