import { mergeListsByIdPreferLocal } from "@/lib/merge-lists";
import { mockUsers } from "@/lib/mock-data/users";
import type { User } from "@/types";

export function mergeUsersLists(remote: User[], local: User[]): User[] {
  const merged = mergeListsByIdPreferLocal(remote, local);
  const ids = new Set(merged.map((user) => user.id));
  for (const mock of mockUsers) {
    if (!ids.has(mock.id)) merged.push(mock);
  }
  return merged.sort((a, b) => a.name.localeCompare(b.name));
}

export function isMockUserId(id: string): boolean {
  return mockUsers.some((user) => user.id === id);
}
