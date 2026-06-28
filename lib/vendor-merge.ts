import { mergeListsByIdPreferLocal } from "@/lib/merge-lists";
import { mockVendors } from "@/lib/mock-data/vendors";
import { normalizeVendor } from "@/lib/vendor";
import type { Vendor } from "@/types";

const mockVendorIds = new Set(mockVendors.map((vendor) => vendor.id));

export function isMockVendorId(id: string): boolean {
  return mockVendorIds.has(id);
}

/** Keep seeded mock vendors, merge API + local user-created vendors. */
export function mergeVendorLists(remote: Vendor[], local: Vendor[]): Vendor[] {
  const userRemote = remote
    .map(normalizeVendor)
    .filter((vendor) => !mockVendorIds.has(vendor.id));
  const userLocal = local
    .map(normalizeVendor)
    .filter((vendor) => !mockVendorIds.has(vendor.id));
  const userVendors = mergeListsByIdPreferLocal(userRemote, userLocal);
  return [...mockVendors.map(normalizeVendor), ...userVendors];
}
