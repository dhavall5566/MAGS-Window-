import { fetchJson, invalidateJsonCache } from "@/lib/fetch-json";
import type { PowderCoating } from "@/types";

const LIST_URL = "/api/powder-coating";

export async function fetchPowderCoatingApi(): Promise<PowderCoating[]> {
  const data = await fetchJson<{ powderCoating?: PowderCoating[] }>(LIST_URL, {
    powderCoating: [],
  });
  return data.powderCoating ?? [];
}

export async function createPowderCoatingApi(
  entry: PowderCoating
): Promise<PowderCoating | null> {
  try {
    const res = await fetch(LIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { powderCoating?: PowderCoating };
    return data.powderCoating ?? entry;
  } catch {
    return null;
  }
}

export async function updatePowderCoatingApi(
  id: string,
  updates: Partial<PowderCoating>
): Promise<PowderCoating | null> {
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { powderCoating?: PowderCoating };
    return data.powderCoating ?? null;
  } catch {
    return null;
  }
}

export async function deletePowderCoatingApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    invalidateJsonCache(LIST_URL);
    return res.ok;
  } catch {
    return false;
  }
}
