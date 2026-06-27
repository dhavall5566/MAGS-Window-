/** Safe client fetch — never throws on 503/non-OK; returns empty object on failure */

const CACHE_STORAGE_PREFIX = "mags-fetch-cache:";

const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

function readStoredCache(): void {
  if (typeof window === "undefined") return;
  try {
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const storageKey = sessionStorage.key(index);
      if (!storageKey?.startsWith(CACHE_STORAGE_PREFIX)) continue;
      const url = storageKey.slice(CACHE_STORAGE_PREFIX.length);
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) continue;
      cache.set(url, JSON.parse(raw) as unknown);
    }
  } catch {
    // Ignore corrupt or unavailable session storage.
  }
}

function persistCacheEntry(url: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${CACHE_STORAGE_PREFIX}${url}`, JSON.stringify(value));
  } catch {
    // Ignore quota errors.
  }
}

readStoredCache();

export function getCachedJson<T extends object = Record<string, unknown>>(
  url: string
): T | undefined {
  const hit = cache.get(url);
  return hit ? (hit as T) : undefined;
}

export function setJsonCacheEntry(url: string, value: object): void {
  cache.set(url, value);
  persistCacheEntry(url, value);
}

export function prefetchJson(url: string): void {
  void fetchJson(url);
}

export function invalidateJsonCache(url: string): void {
  cache.delete(url);
  inflight.delete(url);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(`${CACHE_STORAGE_PREFIX}${url}`);
    } catch {
      // Ignore storage errors.
    }
  }
}

export async function fetchJson<T extends object = Record<string, unknown>>(
  url: string,
  fallback: T = {} as T,
  options?: { force?: boolean }
): Promise<T> {
  if (!options?.force && cache.has(url)) {
    return cache.get(url) as T;
  }

  const pending = inflight.get(url);
  if (pending) {
    return pending as Promise<T>;
  }

  const request = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const fb = fallback;
        if (Object.keys(fb).length > 0) {
          cache.set(url, fb);
          persistCacheEntry(url, fb);
        }
        return fb;
      }
      const data = await res.json();
      const result = (data ?? fallback) as T;
      cache.set(url, result);
      persistCacheEntry(url, result);
      return result;
    } catch {
      const fb = fallback;
      if (Object.keys(fb).length > 0) {
        cache.set(url, fb);
        persistCacheEntry(url, fb);
      }
      return fallback;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, request);
  return request;
}
