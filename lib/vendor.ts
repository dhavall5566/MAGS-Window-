import type { Challan, Vendor, VendorType } from "@/types";
import { VENDOR_TYPE_OPTIONS } from "@/lib/vendor-form";
import {
  isMagsOutwardChallanIssuer,
  MAGS_OUTWARD_CHALLAN_VENDOR_ID,
} from "@/lib/outward-challan-branding";

export const MAGS_VENDOR_ID = "ven-021";

export function resolveVendorType(
  vendor: Pick<Vendor, "id" | "partyName" | "vendorType">
): VendorType {
  if (vendor.vendorType) return vendor.vendorType;
  if (
    vendor.id === MAGS_VENDOR_ID ||
    vendor.partyName.trim().toUpperCase() === "MAGS"
  ) {
    return "powder_coating";
  }
  return "delivery";
}

/** Only the MAGS OC issuer keeps outward_challan; all other parties are delivery customers. */
export function normalizeVendorType(
  vendor: Pick<Vendor, "id" | "partyName" | "vendorType">
): VendorType {
  const resolved = resolveVendorType(vendor);
  if (
    resolved === "outward_challan" &&
    vendor.id !== MAGS_OUTWARD_CHALLAN_VENDOR_ID &&
    !isMagsOutwardChallanIssuer(vendor)
  ) {
    return "delivery";
  }
  return resolved;
}

export function getVendorTypeLabel(vendorType: VendorType): string {
  return VENDOR_TYPE_OPTIONS.find((option) => option.value === vendorType)?.label ?? vendorType;
}

export function getVendorsForChallanType(
  vendors: Vendor[],
  challanType: "outward" | "powder_coating"
): Vendor[] {
  if (challanType === "powder_coating") {
    return vendors.filter((vendor) => vendor.vendorType === "powder_coating");
  }
  return vendors.filter(
    (vendor) =>
      (vendor.vendorType === "outward_challan" || vendor.vendorType === "delivery") &&
      vendor.id !== MAGS_OUTWARD_CHALLAN_VENDOR_ID &&
      !isMagsOutwardChallanIssuer(vendor)
  );
}

export function formatPartyAddress(address: string | undefined): string {
  return (address ?? "").replace(/^Address:\s*/i, "").trim();
}

export function findVendorByPartyName(
  vendors: Vendor[],
  partyName: string
): Vendor | undefined {
  const normalized = partyName.trim().toLowerCase();
  return vendors.find((vendor) => vendor.partyName.trim().toLowerCase() === normalized);
}

export function getVendorChallanDetails(vendor: Vendor): {
  vendorName: string;
  vendorAddress: string;
  vendorPersonName: string;
  vendorContact: string;
  vendorGstNo: string;
} {
  return {
    vendorName: vendor.partyName,
    vendorAddress: formatPartyAddress(vendor.partyAddress),
    vendorPersonName: vendor.personName?.trim() ?? "",
    vendorContact: vendor.phoneNo?.trim() ?? "",
    vendorGstNo: vendor.gstNo?.trim() ?? "",
  };
}

export function enrichChallanVendorDetails<T extends Challan>(
  challan: T,
  vendors: Vendor[]
): T {
  const vendor = findVendorByPartyName(vendors, challan.vendorName);
  if (!vendor) {
    return {
      ...challan,
      vendorAddress: formatPartyAddress(challan.vendorAddress),
      vendorPersonName: challan.vendorPersonName ?? "",
      vendorContact: challan.vendorContact ?? "",
      vendorGstNo: challan.vendorGstNo ?? "",
    };
  }

  return {
    ...challan,
    ...getVendorChallanDetails(vendor),
  };
}

export function getVendorPartyNames(vendors: Vendor[]): string[] {
  return [
    ...new Set(vendors.map((vendor) => vendor.partyName.trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
}

export function normalizeVendor(vendor: Vendor): Vendor {
  return {
    ...vendor,
    partyAddress: formatPartyAddress(vendor.partyAddress),
    personName: vendor.personName ?? "",
    phoneNo: vendor.phoneNo ?? "",
    email: vendor.email?.trim() ?? "",
    gstNo: vendor.gstNo?.trim() ?? "",
    vendorType: normalizeVendorType(vendor),
  };
}
