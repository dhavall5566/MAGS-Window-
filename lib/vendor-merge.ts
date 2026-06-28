import { mergeListsByIdPreferLocal } from "@/lib/merge-lists";
import { mockVendors } from "@/lib/mock-data/vendors";
import { normalizeVendor } from "@/lib/vendor";
import type { Vendor } from "@/types";

const mockVendorIds = new Set<string>();

function getMockVendorIds(): Set<string> {
  if (mockVendorIds.size === 0) {
    for (const vendor of mockVendors) {
      mockVendorIds.add(vendor.id);
    }
  }
  return mockVendorIds;
}

/** Legacy suffix from removed Delivery Challan From → Powder Coating mirroring. */
export const DELIVERY_FROM_POWDER_COATING_MIRROR_SUFFIX = "-powder-coating-mirror";

/** Strip retired seeded vendors still present in persisted store/API data. */
const RETIRED_MOCK_VENDOR_IDS = new Set([
  "ven-delivery-challan-from",
  `ven-delivery-challan-from${DELIVERY_FROM_POWDER_COATING_MIRROR_SUFFIX}`,
  "ven-maahi-delivery-challan-from",
  `ven-maahi-delivery-challan-from${DELIVERY_FROM_POWDER_COATING_MIRROR_SUFFIX}`,
]);

export function isDeliveryChallanFromPowderCoatingMirror(id: string): boolean {
  return id.endsWith(DELIVERY_FROM_POWDER_COATING_MIRROR_SUFFIX);
}

function isRetiredVendor(vendor: Pick<Vendor, "id">): boolean {
  return (
    RETIRED_MOCK_VENDOR_IDS.has(vendor.id) ||
    isDeliveryChallanFromPowderCoatingMirror(vendor.id)
  );
}

/** Normalize vendors; drop legacy mirror copies (tabs are independent). */
export function prepareVendorList(vendors: Vendor[]): Vendor[] {
  return vendors
    .filter((vendor) => !isRetiredVendor(vendor))
    .map(normalizeVendor);
}

export function isMockVendorId(id: string): boolean {
  return getMockVendorIds().has(id);
}

/** Keep seeded mock vendors, merge API + local user-created vendors. */
export function mergeVendorLists(remote: Vendor[], local: Vendor[]): Vendor[] {
  const userRemote = remote
    .map(normalizeVendor)
    .filter((vendor) => !getMockVendorIds().has(vendor.id) && !isRetiredVendor(vendor));
  const userLocal = local
    .map(normalizeVendor)
    .filter((vendor) => !getMockVendorIds().has(vendor.id) && !isRetiredVendor(vendor));
  const userVendors = mergeListsByIdPreferLocal(userRemote, userLocal);
  return prepareVendorList([...mockVendors.map(normalizeVendor), ...userVendors]);
}
