import { fetchJson, invalidateJsonCache } from "@/lib/fetch-json";
import { normalizeVendor } from "@/lib/vendor";
import type { Vendor } from "@/types";

const LIST_URL = "/api/vendors";

export type DeleteVendorResult =
  | { ok: true }
  | { ok: false; error: string; status?: number };

async function readApiErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: string | Array<{ msg?: string }> };
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
    if (Array.isArray(data.detail) && data.detail[0]?.msg) {
      return data.detail[0].msg;
    }
  } catch {
    // ignore parse errors
  }
  return fallback;
}

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

export async function deleteVendorApi(id: string): Promise<DeleteVendorResult> {
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    invalidateJsonCache(LIST_URL);
    if (res.ok) return { ok: true };
    const error = await readApiErrorMessage(res, "Could not delete vendor.");
    return { ok: false, error, status: res.status };
  } catch {
    return {
      ok: false,
      error: "Could not delete vendor. Please check that the backend is running.",
    };
  }
}
