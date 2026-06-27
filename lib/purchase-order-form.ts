import { z } from "zod";
import type { Profile, PurchaseOrder, PurchaseOrderItem } from "@/types";
import {
  findProfileByCode,
  getProfileCodeValue,
  getProfileDesignImage,
  getProfileDisplayName,
  getProfileDyeCode,
  getProfileWeightPerMeter,
  computeLineWeightKg,
  lengthToMeters,
} from "@/lib/profile";

export const DEFAULT_PO_UOM = "MM";

export const purchaseOrderItemSchema = z.object({
  dyeCode: z.string().optional().default(""),
  profileCode: z.string().min(1, "Profile is required"),
  profileName: z.string().optional().default(""),
  profileImage: z.string().optional().default(""),
  kgPerMeter: z.coerce.number().min(0).optional().default(0),
  uom: z.string().optional().default(DEFAULT_PO_UOM),
  length: z.coerce.number().positive("Length must be greater than 0"),
  qty: z.coerce.number().min(0).optional().default(0),
  totalWeightKg: z.coerce.number().min(0, "Weight cannot be negative"),
});

export const purchaseOrderFormSchema = z.object({
  poNumber: z.string().min(1, "PO / D.C. number is required"),
  date: z.string().min(1, "Date is required"),
  vendorName: z.string().min(1, "Party is required"),
  vendorAddress: z.string().optional().default(""),
  gstNo: z.string().optional().default(""),
  personName: z.string().optional().default(""),
  contactNo: z.string().optional().default(""),
  remarks: z.string().optional().default(""),
  items: z.array(purchaseOrderItemSchema).min(1, "Add at least one line item"),
});

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderFormSchema>;

/** Keep length to one decimal place without rounding up. */
export function normalizePurchaseOrderLengthMm(raw: string | number): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value * 10) / 10;
}

/** Total weight (kg) = KG/MTR × (length mm ÷ 1000) × qty. */
export function computePurchaseOrderItemWeight(
  kgPerMeter: number,
  lengthMm: number,
  qty: number,
  uom: string = DEFAULT_PO_UOM
): number {
  return computeLineWeightKg(kgPerMeter, lengthMm, qty, uom);
}

/** Qty = total weight (kg) ÷ (KG/MTR × length in m). Length is stored in mm. */
export function computePurchaseOrderItemQty(
  kgPerMeter: number,
  lengthMm: number,
  totalWeightKg: number,
  uom: string = DEFAULT_PO_UOM
): number {
  const lengthMeters = lengthToMeters(lengthMm, uom);
  const perUnitWeight = (Number(kgPerMeter) || 0) * lengthMeters;
  if (!perUnitWeight || !totalWeightKg) return 0;
  return Math.round((Number(totalWeightKg) / perUnitWeight) * 100) / 100;
}

/** Derive line weight from KG/MTR, length, qty, and UOM (MM ÷ 1000). */
export function resolvePurchaseOrderItemWeight(item: PurchaseOrderItem): number {
  const kgPerMeter = Number(item.kgPerMeter) || 0;
  const length = Number(item.length) || 0;
  const qty = Number(item.qty) || 0;
  const uom = item.uom?.trim() || DEFAULT_PO_UOM;

  if (kgPerMeter > 0 && length > 0 && qty > 0) {
    return computePurchaseOrderItemWeight(kgPerMeter, length, qty, uom);
  }

  return Number(item.totalWeightKg) || 0;
}

export function defaultPurchaseOrderItem(): PurchaseOrderFormData["items"][number] {
  return {
    dyeCode: "",
    profileCode: "",
    profileName: "",
    profileImage: "",
    kgPerMeter: 0,
    uom: DEFAULT_PO_UOM,
    length: 0,
    qty: 0,
    totalWeightKg: 0,
  };
}

export function generatePurchaseOrderNumber(existing: PurchaseOrder[]): string {
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fy = `${String(fyStartYear).slice(-2)}-${String(fyStartYear + 1).slice(-2)}`;
  const seq = (existing?.length ?? 0) + 1;
  return `PO/${String(seq).padStart(2, "0")}/${fy}`;
}

export function buildPurchaseOrderItemFromProfile(
  profile: Profile
): Pick<
  PurchaseOrderItem,
  "dyeCode" | "profileCode" | "profileName" | "profileImage" | "kgPerMeter"
> {
  return {
    dyeCode: getProfileDyeCode(profile),
    profileCode: getProfileCodeValue(profile),
    profileName: getProfileDisplayName(profile),
    profileImage: getProfileDesignImage(profile),
    kgPerMeter: getProfileWeightPerMeter(profile),
  };
}

export function buildPurchaseOrder(
  data: PurchaseOrderFormData,
  profiles: Profile[],
  meta: { id: string }
): PurchaseOrder {
  const items: PurchaseOrderItem[] = data.items.map((item) => {
    const profile = findProfileByCode(profiles, item.profileCode);
    return {
      dyeCode:
        item.dyeCode?.trim() ||
        (profile ? getProfileDyeCode(profile) : undefined) ||
        undefined,
      profileCode: item.profileCode,
      profileName:
        item.profileName?.trim() ||
        (profile ? getProfileDisplayName(profile) : item.profileCode),
      profileImage: item.profileImage?.trim() || (profile ? getProfileDesignImage(profile) : ""),
      kgPerMeter:
        Number(item.kgPerMeter) || (profile ? getProfileWeightPerMeter(profile) : 0),
      uom: item.uom?.trim() || DEFAULT_PO_UOM,
      length: normalizePurchaseOrderLengthMm(item.length),
      qty: Number(item.qty) || 0,
      totalWeightKg: resolvePurchaseOrderItemWeight({
        ...item,
        kgPerMeter:
          Number(item.kgPerMeter) || (profile ? getProfileWeightPerMeter(profile) : 0),
        uom: item.uom?.trim() || DEFAULT_PO_UOM,
        length: normalizePurchaseOrderLengthMm(item.length),
        qty: Number(item.qty) || 0,
      }),
    };
  });

  return {
    id: meta.id,
    poNumber: data.poNumber.trim(),
    date: data.date,
    vendorName: data.vendorName.trim(),
    vendorAddress: data.vendorAddress?.trim() ?? "",
    gstNo: data.gstNo?.trim() || undefined,
    personName: data.personName?.trim() || undefined,
    contactNo: data.contactNo?.trim() || undefined,
    remarks: data.remarks?.trim() || undefined,
    items,
  };
}

export function getPurchaseOrderTotalWeight(order: Pick<PurchaseOrder, "items">): number {
  const total = (order.items ?? []).reduce(
    (sum, item) => sum + resolvePurchaseOrderItemWeight(item),
    0
  );
  return Math.round(total * 100) / 100;
}
