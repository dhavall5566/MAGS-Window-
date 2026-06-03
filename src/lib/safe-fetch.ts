/** Client-safe fetch helpers — never throw; use fallbacks on 503/errors. */

export function hasApiError(data: unknown): boolean {
  return (
    data !== null &&
    typeof data === "object" &&
    "error" in data &&
    Boolean((data as { error?: unknown }).error)
  );
}

export async function safeFetchJson<T>(
  url: string,
  fallback: T,
  validate?: (data: unknown) => boolean
): Promise<{ data: T; demo: boolean }> {
  try {
    const res = await fetch(url);
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok || hasApiError(json)) {
      return { data: fallback, demo: true };
    }
    if (validate && !validate(json)) {
      return { data: fallback, demo: true };
    }
    return { data: json as T, demo: false };
  } catch {
    return { data: fallback, demo: true };
  }
}

export async function safeFetchArray<T>(
  url: string,
  fallback: T[]
): Promise<{ data: T[]; demo: boolean }> {
  return safeFetchJson(url, fallback, (d) => Array.isArray(d));
}
