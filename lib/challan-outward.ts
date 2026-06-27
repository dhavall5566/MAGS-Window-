import {
  findProfileByCode,
  getPowderCoatingChallanRate,
  getPrimaryProfileLength,
  getProfileDesignImage,
  getProfileLengthOptions,
  weightFromConversionUnit,
} from "@/lib/profile";
import type { Challan, ChallanItem, OutwardChallan, PowderCoatingChallan, Profile } from "@/types";

export function getOutwardChallans(challans: Challan[]): OutwardChallan[] {
  return challans.filter((challan): challan is OutwardChallan => challan.type === "outward");
}

export function findOutwardChallanById(
  challans: Challan[],
  id: string
): OutwardChallan | undefined {
  return getOutwardChallans(challans).find((challan) => challan.id === id);
}

export function mapOutwardItemsToCoatingFormItems(
  items: ChallanItem[],
  profiles: Profile[]
) {
  return (items ?? []).map((item) => {
    const profile = findProfileByCode(profiles, item.profileCode);
    const lengthOptions = profile ? getProfileLengthOptions(profile) : [];
    const length =
      profile && lengthOptions.includes(item.length)
        ? item.length
        : profile
          ? getPrimaryProfileLength(profile)
          : item.length;

    return {
      profileCode: item.profileCode,
      profileName: item.profileName,
      profileImage: item.profileImage || (profile ? getProfileDesignImage(profile) : ""),
      length,
      qty: item.qty,
      weight: item.weight,
      rate: profile ? getPowderCoatingChallanRate(profile, length) : 0,
    };
  });
}

export function powderCoatingChallanNumberFromOutward(outwardChallanNumber: string): string {
  const trimmed = outwardChallanNumber.trim();
  if (!trimmed) return "";
  const withoutOutwardPrefix = trimmed.replace(/^OC-/i, "");
  return `PC-${withoutOutwardPrefix}`;
}

export function applyOutwardChallanToCoatingForm(
  outward: OutwardChallan,
  profiles: Profile[]
) {
  return {
    challanNumber: powderCoatingChallanNumberFromOutward(outward.challanNumber),
    sourceOutwardChallanId: outward.id,
    sourceOutwardChallanNumber: outward.challanNumber,
    projectName: getOutwardChallanProjectName(outward),
    vehicleNumber: outward.vehicleNumber,
    driverName: outward.driverName,
    items: mapOutwardItemsToCoatingFormItems(outward.items, profiles),
  };
}

export function formatOutwardChallanLabel(challan: OutwardChallan): string {
  return `${challan.challanNumber} — ${challan.date}`;
}

export function getOutwardChallanProjectName(
  challan: Pick<OutwardChallan | PowderCoatingChallan, "projectName" | "remarks">
): string {
  return challan.projectName?.trim() || challan.remarks?.trim() || "";
}

export function sumChallanItemQuantities(
  items: ReadonlyArray<Pick<ChallanItem, "qty">>
): number {
  return items.reduce(
    (sum, item) => sum + Math.max(0, Math.trunc(Number(item.qty) || 0)),
    0
  );
}

export function resolveChallanItemWeight(
  item: Pick<ChallanItem, "profileCode" | "length" | "qty" | "weight">,
  profiles: Profile[]
): number {
  const profile = findProfileByCode(profiles, item.profileCode);
  const length = Number(item.length) || 0;
  const qty = Number(item.qty) || 0;
  if (profile && length > 0 && qty > 0) {
    return weightFromConversionUnit(profile, { length, qty });
  }
  return Math.max(0, Number(item.weight) || 0);
}

export function sumChallanItemWeights(
  items: ReadonlyArray<Pick<ChallanItem, "profileCode" | "length" | "qty" | "weight">>,
  profiles: Profile[] = []
): number {
  const total = items.reduce(
    (sum, item) =>
      sum +
      (profiles.length > 0
        ? resolveChallanItemWeight(item, profiles)
        : Math.max(0, Number(item.weight) || 0)),
    0
  );
  return Math.round(total * 100) / 100;
}
