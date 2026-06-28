import { z } from "zod";
import {
  buildStockInwardMetrics,
  getStockInwardKgPerMeter,
  getStockInwardProfileImage,
  resolveStockInwardProfile,
} from "@/lib/stock-inward-calculations";
import { getProfileDesignImage } from "@/lib/profile";
import { normalizeStockLength } from "@/lib/stock-master";
import type { Profile, StockInward, Vendor } from "@/types";

import { getDefaultStockInwardSupplier } from "@/lib/vendor";

/** Preserve stored supplier names; suppliers are managed under Vendors → Suppliers. */
export function normalizeStockInwardSupplier(supplier: string | undefined | null): string {
  return supplier?.trim() ?? "";
}

export const stockInwardLengthRowSchema = z.object({
  lengthInMeter: z.coerce.number().min(0.01, "Length is required"),
  totalWeightKg: z.coerce.number().min(0.01, "Total weight is required"),
  totalProfiles: z.coerce.number().min(0.01, "NOS is required"),
  kgPerMeter: z.coerce.number().min(0).optional().default(0),
});

export type StockInwardLengthRow = z.infer<typeof stockInwardLengthRowSchema>;

export const stockInwardProfileRowSchema = z.object({
  dyeCode: z.string().trim().min(1, "Die code is required"),
  profileCode: z.string().min(1, "Profile is required"),
  profileImage: z.string().optional().default(""),
  kgPerMeter: z.coerce.number().min(0).optional().default(0),
  lengthRows: z.array(stockInwardLengthRowSchema).min(1, "Add at least one length"),
});

export type StockInwardProfileRow = z.infer<typeof stockInwardProfileRowSchema>;

export function createEmptyStockInwardLengthRow(kgPerMeter = 0): StockInwardLengthRow {
  return { lengthInMeter: 0, totalWeightKg: 0, totalProfiles: 0, kgPerMeter };
}

export function createEmptyStockInwardProfileRow(): StockInwardProfileRow {
  return {
    dyeCode: "",
    profileCode: "",
    profileImage: "",
    kgPerMeter: 0,
    lengthRows: [createEmptyStockInwardLengthRow()],
  };
}

const sharedStockInwardFields = {
  date: z.string().min(1, "Date is required"),
  invoiceNo: z.string().trim(),
  supplier: z.string().trim().min(1, "Supplier is required"),
  dyeCode: z.string().trim().min(1, "Die code is required"),
  profileCode: z.string().min(1, "Profile is required"),
  profileImage: z.string().optional().default(""),
  kgPerMeter: z.coerce.number().min(0).optional().default(0),
};

export const stockInwardFormSchema = z.object({
  ...sharedStockInwardFields,
  totalWeightKg: z.coerce.number().min(0.01, "Total weight is required"),
  totalProfiles: z.coerce.number().min(0.01, "NOS is required"),
  lengthInMeter: z.coerce.number().min(0.01, "Length is required"),
});

export type StockInwardFormData = z.infer<typeof stockInwardFormSchema>;

export const stockInwardAddFormSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    invoiceNo: z.string().trim(),
    supplier: z.string().trim().min(1, "Supplier is required"),
    profileRows: z.array(stockInwardProfileRowSchema).min(1, "Add at least one die code"),
  })
  .superRefine((data, ctx) => {
    const seenDyeCodes = new Set<string>();

    data.profileRows.forEach((profileRow, profileIndex) => {
      const dyeKey = profileRow.dyeCode.trim().toLowerCase();
      if (dyeKey) {
        if (seenDyeCodes.has(dyeKey)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "This die code is already added",
            path: ["profileRows", profileIndex, "dyeCode"],
          });
        }
        seenDyeCodes.add(dyeKey);
      }

      const seenLengths = new Set<number>();
      profileRow.lengthRows.forEach((row, lengthIndex) => {
        const length = normalizeStockLength(row.lengthInMeter);
        if (!length) return;
        if (seenLengths.has(length)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Each length can only be added once",
            path: ["profileRows", profileIndex, "lengthRows", lengthIndex, "lengthInMeter"],
          });
        }
        seenLengths.add(length);
      });
    });
  });

export type StockInwardAddFormData = z.infer<typeof stockInwardAddFormSchema>;

export function createEmptyStockInwardAddFormDefaults(vendors: Vendor[]): StockInwardAddFormData {
  return {
    date: new Date().toISOString().split("T")[0],
    invoiceNo: "",
    supplier: getDefaultStockInwardSupplier(vendors),
    profileRows: [createEmptyStockInwardProfileRow()],
  };
}

export function stockInwardEntryToAddFormData(
  entry: StockInward,
  profiles: Profile[]
): StockInwardAddFormData {
  const profile = profiles.find((item) => item.code === entry.profileCode);
  const kgPerMeter = entry.kgPerMeter ?? getStockInwardKgPerMeter(profile);

  return {
    date: entry.date,
    invoiceNo: entry.invoiceNo ?? "",
    supplier: normalizeStockInwardSupplier(entry.supplier),
    profileRows: [
      {
        dyeCode: entry.dyeCode ?? "",
        profileCode: entry.profileCode,
        profileImage: getStockInwardProfileImage(entry, profile),
        kgPerMeter,
        lengthRows: [
          {
            lengthInMeter: entry.length ?? 0,
            totalWeightKg: entry.totalWeightKg ?? entry.weight ?? 0,
            totalProfiles: entry.quantity ?? 0,
            kgPerMeter,
          },
        ],
      },
    ],
  };
}

export function buildStockInwardEntry(
  data: StockInwardFormData,
  profiles: Profile[],
  base: Pick<StockInward, "id" | "inwardNo"> & Partial<StockInward>
): StockInward | null {
  const profile = resolveStockInwardProfile(profiles, data.dyeCode, data.profileCode);
  if (!profile) return null;

  const kgPerMeter = data.kgPerMeter || getStockInwardKgPerMeter(profile);
  const metrics = buildStockInwardMetrics(profile, data.totalWeightKg, data.lengthInMeter);

  return {
    id: base.id,
    inwardNo: base.inwardNo,
    invoiceNo: data.invoiceNo?.trim() || undefined,
    date: data.date,
    supplier: data.supplier,
    dyeCode: data.dyeCode.trim(),
    profileCode: profile.code,
    profileName: profile.name,
    profileImage:
      data.profileImage?.trim() ||
      getStockInwardProfileImage({ profileImage: data.profileImage, profileCode: profile.code }, profile),
    totalWeightKg: data.totalWeightKg,
    length: data.lengthInMeter,
    kgPerMeter,
    quantity: metrics.totalProfiles,
    weight: data.totalWeightKg,
    remarks: base.remarks ?? "",
  };
}

export function generateInwardNo(existing: { inwardNo?: string }[]): string {
  return generateInwardNos(existing, 1)[0];
}

export function generateInwardNos(
  existing: { inwardNo?: string }[],
  count: number
): string[] {
  const year = new Date().getFullYear();
  const prefix = `INW-${year}-`;
  const nums = existing
    .map((e) => e.inwardNo?.match(/INW-\d+-(\d+)/)?.[1])
    .filter(Boolean)
    .map(Number);
  let next = (nums.length ? Math.max(...nums) : 0) + 1;
  return Array.from({ length: count }, () => {
    const inwardNo = `${prefix}${String(next).padStart(4, "0")}`;
    next += 1;
    return inwardNo;
  });
}

export function buildStockInwardEntriesFromAddForm(
  data: StockInwardAddFormData,
  profiles: Profile[],
  existingInward: { inwardNo?: string }[],
  createId: () => string
): StockInward[] {
  const entries: StockInward[] = [];

  for (const profileRow of data.profileRows) {
    const profile = resolveStockInwardProfile(profiles, profileRow.dyeCode, profileRow.profileCode);
    if (!profile) continue;

    const kgPerMeter = profileRow.kgPerMeter || getStockInwardKgPerMeter(profile);
    const profileImage = profileRow.profileImage?.trim() || getProfileDesignImage(profile);
    const inwardNos = generateInwardNos([...existingInward, ...entries], profileRow.lengthRows.length);

    profileRow.lengthRows.forEach((row, index) => {
      const length = normalizeStockLength(row.lengthInMeter);
      const metrics = buildStockInwardMetrics(profile, row.totalWeightKg, length);
      entries.push({
        id: createId(),
        inwardNo: inwardNos[index],
        invoiceNo: data.invoiceNo?.trim() || undefined,
        date: data.date,
        supplier: data.supplier,
        dyeCode: profileRow.dyeCode.trim(),
        profileCode: profile.code,
        profileName: profile.name,
        profileImage,
        totalWeightKg: row.totalWeightKg,
        length,
        kgPerMeter: row.kgPerMeter || kgPerMeter,
        quantity: metrics.totalProfiles,
        weight: row.totalWeightKg,
        remarks: "",
      });
    });
  }

  return entries;
}

export function buildStockInwardEntriesFromEditForm(
  data: StockInwardAddFormData,
  profiles: Profile[],
  baseEntry: StockInward,
  existingInward: StockInward[],
  createId: () => string
): StockInward[] {
  const withoutBase = existingInward.filter((item) => item.id !== baseEntry.id);
  const entries: StockInward[] = [];

  for (const profileRow of data.profileRows) {
    const profile = resolveStockInwardProfile(profiles, profileRow.dyeCode, profileRow.profileCode);
    if (!profile) continue;

    const kgPerMeter = profileRow.kgPerMeter || getStockInwardKgPerMeter(profile);
    const profileImage = profileRow.profileImage?.trim() || getProfileDesignImage(profile);

    profileRow.lengthRows.forEach((row) => {
      const length = normalizeStockLength(row.lengthInMeter);
      const metrics = buildStockInwardMetrics(profile, row.totalWeightKg, length);
      const isFirst = entries.length === 0;
      const inwardNo = isFirst
        ? baseEntry.inwardNo
        : generateInwardNos([...withoutBase, ...entries], 1)[0];

      entries.push({
        id: isFirst ? baseEntry.id : createId(),
        inwardNo,
        invoiceNo: data.invoiceNo?.trim() || undefined,
        date: data.date,
        supplier: data.supplier,
        dyeCode: profileRow.dyeCode.trim(),
        profileCode: profile.code,
        profileName: profile.name,
        profileImage,
        totalWeightKg: row.totalWeightKg,
        length,
        kgPerMeter: row.kgPerMeter || kgPerMeter,
        quantity: metrics.totalProfiles,
        weight: row.totalWeightKg,
        remarks: isFirst ? baseEntry.remarks ?? "" : "",
      });
    });
  }

  return entries;
}

export function countStockInwardEntriesFromAddForm(data: StockInwardAddFormData): number {
  return data.profileRows.reduce((total, row) => total + row.lengthRows.length, 0);
}

/** Sum total weight (kg) across all profile rows and their length entries. */
export function calculateStockInwardAddFormTotalWeightKg(
  profileRows: StockInwardAddFormData["profileRows"]
): number {
  const total = profileRows.reduce((profileSum, profileRow) => {
    const rowSum = profileRow.lengthRows.reduce(
      (lengthSum, lengthRow) => lengthSum + (Number(lengthRow.totalWeightKg) || 0),
      0
    );
    return profileSum + rowSum;
  }, 0);

  return Math.round(total * 100) / 100;
}
