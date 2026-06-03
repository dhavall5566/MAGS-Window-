import type { ChallanStatus, ChallanType, PowderCoatingColor } from "./types";

export const CHALLAN_TYPE_LABELS: Record<ChallanType, string> = {
  OUTWARD: "Outward Challan",
  POWDER_COATING: "Powder Coating Challan",
  RETURN: "Return Challan",
};

export const CHALLAN_STATUS_LABELS: Record<ChallanStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  SENT_FOR_COATING: "Sent for Coating",
  IN_PROCESS: "In Process",
  RETURNED: "Returned",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function colorLabel(color: PowderCoatingColor | null | undefined) {
  if (!color) return "—";
  return color.replace(/_/g, " ");
}
