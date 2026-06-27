import { fetchJson, invalidateJsonCache } from "@/lib/fetch-json";
import type { Challan } from "@/types";

const LIST_URL = "/api/challans";

export async function createChallanApi(challan: Challan): Promise<Challan | null> {
  try {
    const res = await fetch(LIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(challan),
    });
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { challan?: Challan };
    return data.challan ?? challan;
  } catch {
    return null;
  }
}

export async function updateChallanApi(challan: Challan): Promise<Challan | null> {
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(challan.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(challan),
    });
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { challan?: Challan };
    return data.challan ?? challan;
  } catch {
    return null;
  }
}

export async function deleteChallanApi(id: string): Promise<boolean> {
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

export async function fetchChallans(): Promise<Challan[]> {
  const data = await fetchJson<{ challans?: Challan[] }>(LIST_URL, { challans: [] });
  return data.challans ?? [];
}
