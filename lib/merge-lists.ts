/** Merge two lists by id; local entries override remote and fill gaps. */
export function mergeListsByIdPreferLocal<T extends { id: string }>(
  remote: T[],
  local: T[]
): T[] {
  const byId = new Map<string, T>();
  for (const item of remote) {
    if (item?.id) byId.set(item.id, item);
  }
  for (const item of local) {
    if (item?.id) byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

/** Merge two lists by id; remote (API) entries override local stale copies. */
export function mergeListsByIdPreferRemote<T extends { id: string }>(
  remote: T[],
  local: T[]
): T[] {
  const byId = new Map<string, T>();
  for (const item of local) {
    if (item?.id) byId.set(item.id, item);
  }
  for (const item of remote) {
    if (item?.id) byId.set(item.id, item);
  }
  return Array.from(byId.values());
}
