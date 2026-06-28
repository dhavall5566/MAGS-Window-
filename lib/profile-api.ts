import { fetchJson, invalidateJsonCache } from "@/lib/fetch-json";
import { normalizeProfile } from "@/lib/profile";
import type { Profile } from "@/types";

const LIST_URL = "/api/profiles";

export async function fetchProfilesApi(): Promise<Profile[]> {
  const data = await fetchJson<{ profiles?: Profile[] }>(LIST_URL, { profiles: [] });
  return (data.profiles ?? []).map(normalizeProfile);
}

export async function createProfileApi(profile: Profile): Promise<Profile | null> {
  try {
    const res = await fetch(LIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { profile?: Profile };
    return data.profile ? normalizeProfile(data.profile) : normalizeProfile(profile);
  } catch {
    return null;
  }
}

export async function updateProfileApi(
  id: string,
  updates: Partial<Profile>
): Promise<Profile | null> {
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { profile?: Profile };
    return data.profile ? normalizeProfile(data.profile) : null;
  } catch {
    return null;
  }
}

/** Update an existing profile or create it when missing from the backend. */
export async function upsertProfileApi(profile: Profile): Promise<Profile | null> {
  const normalized = normalizeProfile(profile);
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(normalized.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    });
    invalidateJsonCache(LIST_URL);
    if (res.ok) {
      const data = (await res.json()) as { profile?: Profile };
      return data.profile ? normalizeProfile(data.profile) : normalized;
    }
    if (res.status === 404) {
      return createProfileApi(normalized);
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteProfileApi(id: string): Promise<boolean> {
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
