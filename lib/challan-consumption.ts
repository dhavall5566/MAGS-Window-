import type { Challan, ChallanItem, Consumption } from "@/types";

export function challanConsumesStock(challan: Challan): boolean {
  return challan.type === "outward" || challan.type === "powder_coating";
}

export function challanReturnsStock(challan: Challan): boolean {
  return challan.type === "return";
}

function itemMultiplier(challan: Challan): number {
  return challanReturnsStock(challan) ? -1 : 1;
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
    projectName: challan.vendorName,
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
