import { setJsonCacheEntry } from "@/lib/fetch-json";

/** Keep session fetch cache aligned with the Zustand store after a mutation. */
export function syncListCache<K extends string>(
  url: string,
  listKey: K,
  items: unknown[]
): void {
  setJsonCacheEntry(url, { [listKey]: items });
}
