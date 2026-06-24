/** Safe client fetch — never throws on 503/non-OK; returns empty object on failure */

const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

export function getCachedJson<T extends object = Record<string, unknown>>(
  url: string
): T | undefined {
  const hit = cache.get(url);
  return hit ? (hit as T) : undefined;
}

export function prefetchJson(url: string): void {
  void fetchJson(url);
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
        cache.set(url, fb);
        return fb;
      }
      const data = await res.json();
      const result = (data ?? fallback) as T;
      cache.set(url, result);
      return result;
    } catch {
      cache.set(url, fallback);
      return fallback;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, request);
  return request;
}
