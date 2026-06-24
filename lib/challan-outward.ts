import {
  findProfileByCode,
  getChallanRatePerMeter,
  getPrimaryProfileLength,
  getProfileDesignImage,
  getProfileLengthOptions,
} from "@/lib/profile";
import type { Challan, ChallanItem, OutwardChallan, Profile } from "@/types";

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
      rate: profile ? getChallanRatePerMeter(profile) : 0,
    };
  });
}

export function applyOutwardChallanToCoatingForm(
  outward: OutwardChallan,
  profiles: Profile[]
) {
  return {
    sourceOutwardChallanId: outward.id,
    sourceOutwardChallanNumber: outward.challanNumber,
    vehicleNumber: outward.vehicleNumber,
    driverName: outward.driverName,
    items: mapOutwardItemsToCoatingFormItems(outward.items, profiles),
  };
}

export function formatOutwardChallanLabel(challan: OutwardChallan): string {
  return `${challan.challanNumber} — ${challan.date}`;
}
