import { COMPANY, DELIVERY_CHALLAN, PURCHASE_ORDER } from "@/lib/company";
import { formatGstNo } from "@/lib/utils";
import { formatPartyAddress, normalizeVendorType } from "@/lib/vendor";
import { isMockVendorId } from "@/lib/vendor-merge";
import { MAGS_OUTWARD_CHALLAN_VENDOR_ID } from "@/lib/vendor-ids";
import type { OutwardChallan, PowderCoatingChallan, Vendor } from "@/types";

export { MAGS_OUTWARD_CHALLAN_VENDOR_ID };

export interface OutwardChallanPdfBranding {
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  email: string;
  phone: string;
  gstNo: string;
  signatoryLine: string;
  logoUrl?: string;
}

export function isMagsOutwardChallanIssuer(
  vendor: Pick<Vendor, "id" | "partyName">
): boolean {
  return (
    vendor.id === MAGS_OUTWARD_CHALLAN_VENDOR_ID ||
    vendor.partyName.trim().toUpperCase() === "MAGS"
  );
}

export function getOutwardChallanIssuerVendors(vendors: Vendor[]): Vendor[] {
  return vendors
    .filter((vendor) => vendor.vendorType === "outward_challan")
    .sort((a, b) => {
      if (isMagsOutwardChallanIssuer(a)) return -1;
      if (isMagsOutwardChallanIssuer(b)) return 1;
      return a.partyName.localeCompare(b.partyName);
    });
}

export function findOutwardChallanIssuerById(
  vendors: Vendor[],
  vendorId: string | undefined
): Vendor | undefined {
  if (!vendorId?.trim()) return undefined;
  return getOutwardChallanIssuerVendors(vendors).find((vendor) => vendor.id === vendorId);
}

export function getDefaultOutwardChallanVendorId(vendors: Vendor[]): string {
  const issuers = getOutwardChallanIssuerVendors(vendors);
  return (
    issuers.find(isMagsOutwardChallanIssuer)?.id ??
    issuers[0]?.id ??
    ""
  );
}

export function getDeliveryChallanFromVendors(vendors: Vendor[]): Vendor[] {
  return vendors
    .filter((vendor) => normalizeVendorType(vendor) === "delivery_challan_from")
    .sort((a, b) => a.partyName.localeCompare(b.partyName));
}

export function findDeliveryChallanFromVendorById(
  vendors: Vendor[],
  vendorId: string | undefined
): Vendor | undefined {
  if (!vendorId?.trim()) return undefined;
  return getDeliveryChallanFromVendors(vendors).find((vendor) => vendor.id === vendorId);
}

export function findDeliveryChallanFromVendorByName(
  vendors: Vendor[],
  name: string | undefined
): Vendor | undefined {
  if (!name?.trim()) return undefined;
  const normalized = name.trim().toLowerCase();
  return getDeliveryChallanFromVendors(vendors).find((vendor) => {
    const partyName = vendor.partyName.trim().toLowerCase();
    const headerName = vendor.challanHeaderName?.trim().toLowerCase() ?? "";
    return partyName === normalized || headerName === normalized;
  });
}

/** Default issuer: user-created Delivery Challan From vendors first, then seeded default. */
export function getDefaultDeliveryChallanFromVendorId(vendors: Vendor[]): string {
  const options = getDeliveryChallanFromVendors(vendors);
  const userCreated = options.find((vendor) => !isMockVendorId(vendor.id));
  return userCreated?.id ?? options[0]?.id ?? "";
}

export function getDeliveryChallanFromDisplayName(vendor: Vendor | undefined): string {
  if (!vendor) return "";
  return vendor.challanHeaderName?.trim() || vendor.partyName.trim();
}

function getDefaultDeliveryChallanPdfBranding(): OutwardChallanPdfBranding {
  return {
    companyName: PURCHASE_ORDER.companyName,
    addressLine1: "04, Umiya Industrial Park, Chhatral G.I.D.C, Phase-3",
    addressLine2: "Ta: Kalol, Dist : Gandhinagar, Gujarat-382729",
    email: PURCHASE_ORDER.email,
    phone: PURCHASE_ORDER.phone,
    gstNo: "",
    signatoryLine: "For, MAAHI ALUGLAZE SYSTEM",
    logoUrl: COMPANY.logo,
  };
}

/** PDF header/contact/footer branding from a Delivery Challan From vendor record. */
export function buildDeliveryChallanFromPdfBranding(vendor: Vendor): OutwardChallanPdfBranding {
  const { line1, line2 } = splitVendorAddressForPdf(vendor);
  const companyName = vendor.challanHeaderName?.trim() || vendor.partyName.trim();

  return {
    companyName,
    addressLine1: line1,
    addressLine2: line2,
    email: vendor.challanEmail?.trim() || vendor.email?.trim() || "",
    phone: vendor.challanPhone?.trim() || vendor.phoneNo?.trim() || "",
    gstNo: formatGstNo(vendor.gstNo),
    signatoryLine: vendor.challanSignatoryLine?.trim() || `For, ${companyName}`,
    logoUrl: COMPANY.logo,
  };
}

export function resolveOutwardDeliveryChallanPdfBranding(
  challan: Pick<OutwardChallan, "deliveryChallanFromVendorId" | "deliveryChallanFromVendorName">,
  vendors: Vendor[]
): OutwardChallanPdfBranding {
  const vendor =
    findDeliveryChallanFromVendorById(vendors, challan.deliveryChallanFromVendorId) ??
    findDeliveryChallanFromVendorByName(vendors, challan.deliveryChallanFromVendorName) ??
    (challan.deliveryChallanFromVendorId
      ? vendors.find((entry) => entry.id === challan.deliveryChallanFromVendorId)
      : undefined);

  if (vendor) {
    return buildDeliveryChallanFromPdfBranding(vendor);
  }

  return getDefaultDeliveryChallanPdfBranding();
}

function splitVendorAddressForPdf(vendor: Vendor): { line1: string; line2: string } {
  if (vendor.challanAddressLine1?.trim()) {
    return {
      line1: vendor.challanAddressLine1.trim(),
      line2: vendor.challanAddressLine2?.trim() ?? "",
    };
  }

  const address = formatPartyAddress(vendor.partyAddress);
  if (!address) return { line1: "", line2: "" };

  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return { line1: address, line2: "" };
  if (parts.length === 2) return { line1: parts[0], line2: parts[1] };

  const mid = Math.ceil(parts.length / 2);
  return {
    line1: parts.slice(0, mid).join(", "),
    line2: parts.slice(mid).join(", "),
  };
}

export function getOutwardChallanPdfBranding(
  vendor: Vendor | undefined
): OutwardChallanPdfBranding {
  if (!vendor || isMagsOutwardChallanIssuer(vendor)) {
    return getDefaultDeliveryChallanPdfBranding();
  }

  const { line1, line2 } = splitVendorAddressForPdf(vendor);
  const companyName = vendor.challanHeaderName?.trim() || vendor.partyName.trim();

  return {
    companyName,
    addressLine1: line1,
    addressLine2: line2,
    email: vendor.challanEmail?.trim() || vendor.email?.trim() || "",
    phone: vendor.challanPhone?.trim() || vendor.phoneNo?.trim() || "",
    gstNo: formatGstNo(vendor.gstNo),
    signatoryLine:
      vendor.challanSignatoryLine?.trim() || `For, ${companyName}`,
    logoUrl: COMPANY.logo,
  };
}

export function resolveOutwardChallanPdfBranding(
  challan: Pick<PowderCoatingChallan, "outwardChallanVendorId">,
  vendors: Vendor[]
): OutwardChallanPdfBranding {
  const vendor =
    findOutwardChallanIssuerById(vendors, challan.outwardChallanVendorId) ??
    findOutwardChallanIssuerById(
      vendors,
      getDefaultOutwardChallanVendorId(vendors)
    );
  return getOutwardChallanPdfBranding(vendor);
}
