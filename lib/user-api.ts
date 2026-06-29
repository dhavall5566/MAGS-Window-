import { fetchJson, invalidateJsonCache } from "@/lib/fetch-json";
import type { User } from "@/types";

const LIST_URL = "/api/users";

export async function fetchUsersApi(): Promise<User[]> {
  const data = await fetchJson<{ users?: User[] }>(LIST_URL, { users: [] });
  return data.users ?? [];
}

export async function createUserApi(user: User): Promise<User | null> {
  try {
    const res = await fetch(LIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: User };
    return data.user ?? user;
  } catch {
    return null;
  }
}

export async function updateUserApi(id: string, updates: Partial<User>): Promise<User | null> {
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: User };
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function deleteUserApi(id: string): Promise<boolean> {
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
