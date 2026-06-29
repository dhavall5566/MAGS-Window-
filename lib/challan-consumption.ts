import { getOutwardChallanProjectName } from "@/lib/challan-outward";
import type { Challan, ChallanItem, Consumption } from "@/types";

/** Return challans are hidden from the UI but may still exist in legacy data. */
export function isHiddenChallanType(type: Challan["type"]): boolean {
  return type === "return";
}

export function filterVisibleChallans(challans: Challan[]): Challan[] {
  return (challans ?? []).filter((challan) => !isHiddenChallanType(challan.type));
}

export function challanConsumesStock(challan: Challan): boolean {
  return challan.type === "outward" || challan.type === "powder_coating";
}

function itemMultiplier(_challan: Challan): number {
  return 1;
}

export function consumptionEntryFromChallanItem(
  challan: Challan,
  item: ChallanItem,
  index: number
): Consumption {
  const sign = itemMultiplier(challan);
  return {
    id: `${challan.id}-item-${index}`,
    consumptionNo: `${challan.challanNumber}-${String(index + 1).padStart(2, "0")}`,
    date: challan.date,
    projectName: isOutwardChallan(challan)
      ? getOutwardChallanProjectName(challan) || challan.vendorName
      : challan.vendorName,
    profileCode: item.profileCode,
    profileName: item.profileName,
    length: item.length,
    quantity: item.qty * sign,
    weight: Math.round(item.weight * sign * 100) / 100,
    issuedBy: challan.driverName,
    challanId: challan.id,
    challanNumber: challan.challanNumber,
    challanType: challan.type,
  };
}

export function consumptionEntriesFromChallan(challan: Challan): Consumption[] {
  return (challan.items ?? []).map((item, index) =>
    consumptionEntryFromChallanItem(challan, item, index)
  );
}

export function consumptionEntriesFromChallans(challans: Challan[]): Consumption[] {
  return challans.flatMap(consumptionEntriesFromChallan);
}

export function isOutwardChallan(challan: Challan): boolean {
  return challan.type === "outward";
}

export function isStockAffectingChallan(challan: Challan): boolean {
  return challan.type === "outward" || challan.type === "powder_coating";
}

export function consumptionEntriesFromOutwardChallans(challans: Challan[]): Consumption[] {
  return challans.filter(isOutwardChallan).flatMap(consumptionEntriesFromChallan);
}

export function consumptionEntriesFromStockChallans(challans: Challan[]): Consumption[] {
  return challans.filter(isStockAffectingChallan).flatMap(consumptionEntriesFromChallan);
}

/** Merge challans: API/DB is canonical; local store only overlays fields for ids already on the server. */
export function mergeChallans(api: Challan[], store: Challan[]): Challan[] {
  const byId = new Map<string, Challan>();

  for (const entry of api) {
    if (!entry?.id) continue;
    byId.set(entry.id, { ...entry });
  }

  for (const entry of store) {
    if (!entry?.id) continue;
    const existing = byId.get(entry.id);
    if (existing) {
      byId.set(entry.id, { ...existing, ...entry });
    }
  }

  return filterVisibleChallans(Array.from(byId.values()));
}

/** Append a challan that is not yet reflected in the latest API list (optimistic create). */
export function appendChallanIfMissing(list: Challan[], challan: Challan): Challan[] {
  if (!challan?.id) return list;
  if (list.some((entry) => entry.id === challan.id)) {
    return list.map((entry) => (entry.id === challan.id ? challan : entry));
  }
  return filterVisibleChallans([...list, challan]);
}

export function buildOutwardConsumptionFromChallans(
  apiChallans: Challan[],
  storeChallans: Challan[]
): Consumption[] {
  return consumptionEntriesFromOutwardChallans(mergeChallans(apiChallans, storeChallans));
}

export function buildStockConsumptionFromChallans(
  apiChallans: Challan[],
  storeChallans: Challan[]
): Consumption[] {
  return consumptionEntriesFromStockChallans(mergeChallans(apiChallans, storeChallans));
}

/** Manual consumption entries only — excludes challan-derived rows. */
export function getManualConsumption(consumption: Consumption[]): Consumption[] {
  return (consumption ?? []).filter((entry) => !entry.challanId);
}

export function mergeConsumption(
  api: Consumption[],
  store: Consumption[]
): Consumption[] {
  const merged = [...api];
  store.forEach((entry) => {
    const existing = merged.find((m) => m?.id === entry?.id);
    if (existing) {
      Object.assign(existing, entry);
    } else {
      merged.push(entry);
    }
  });
  return merged;
}

export function mergeManualConsumption(
  api: Consumption[],
  store: Consumption[]
): Consumption[] {
  return mergeConsumption(api, getManualConsumption(store));
}

export function getProfileStockKey(
  entry: Pick<Consumption, "profileCode" | "profileName">
): string {
  return entry.profileCode?.trim() || entry.profileName?.trim() || "";
}

export function getConsumptionWeightByProfile(
  consumption: Consumption[]
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of consumption) {
    const key = getProfileStockKey(entry);
    if (!key) continue;
    totals.set(key, (totals.get(key) ?? 0) + (entry.weight ?? 0));
  }
  return totals;
}
