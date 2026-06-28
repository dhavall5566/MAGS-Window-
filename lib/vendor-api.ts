import { fetchJson, invalidateJsonCache } from "@/lib/fetch-json";
import { normalizeVendor } from "@/lib/vendor";
import type { Vendor } from "@/types";

const LIST_URL = "/api/vendors";

export async function fetchVendorsApi(): Promise<Vendor[]> {
  const data = await fetchJson<{ vendors?: Vendor[] }>(LIST_URL, { vendors: [] });
  return (data.vendors ?? []).map(normalizeVendor);
}

export async function createVendorApi(vendor: Vendor): Promise<Vendor | null> {
  try {
    const res = await fetch(LIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vendor),
    });
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { vendor?: Vendor };
    return data.vendor ? normalizeVendor(data.vendor) : normalizeVendor(vendor);
  } catch {
    return null;
  }
}

export async function updateVendorApi(
  id: string,
  updates: Partial<Vendor>
): Promise<Vendor | null> {
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { vendor?: Vendor };
    return data.vendor ? normalizeVendor(data.vendor) : null;
  } catch {
    return null;
  }
}

export async function deleteVendorApi(id: string): Promise<boolean> {
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
