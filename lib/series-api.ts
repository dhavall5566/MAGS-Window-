import { fetchJson, invalidateJsonCache } from "@/lib/fetch-json";
import type { SeriesName } from "@/types";

const LIST_URL = "/api/series";

function normalizeSeries(entry: SeriesName): SeriesName {
  return {
    ...entry,
    profileCount:
      typeof entry.profileCount === "number" && Number.isFinite(entry.profileCount)
        ? entry.profileCount
        : 0,
  };
}

export type DeleteSeriesResult =
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

export async function fetchSeriesApi(): Promise<SeriesName[]> {
  const data = await fetchJson<{ series?: SeriesName[] }>(LIST_URL, { series: [] });
  return (data.series ?? []).map(normalizeSeries);
}

export async function createSeriesApi(series: SeriesName): Promise<SeriesName | null> {
  try {
    const res = await fetch(LIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(series),
    });
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { series?: SeriesName };
    return data.series ? normalizeSeries(data.series) : normalizeSeries(series);
  } catch {
    return null;
  }
}

export async function updateSeriesApi(
  id: string,
  updates: Partial<SeriesName>
): Promise<SeriesName | null> {
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { series?: SeriesName };
    return data.series ? normalizeSeries(data.series) : null;
  } catch {
    return null;
  }
}

export async function deleteSeriesApi(id: string): Promise<DeleteSeriesResult> {
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    invalidateJsonCache(LIST_URL);
    if (res.ok) return { ok: true };
    const error = await readApiErrorMessage(res, "Could not delete series.");
    return { ok: false, error, status: res.status };
  } catch {
    return { ok: false, error: "Could not delete series. Please check that the backend is running." };
  }
}
