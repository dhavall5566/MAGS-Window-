import { z } from "zod";
import {
  buildStockInwardMetrics,
  resolveStockInwardProfile,
} from "@/lib/stock-inward-calculations";
import type { Profile, StockInward } from "@/types";

export const STOCK_INWARD_SUPPLIERS = [
  "Sreenathji-1",
  "Sreenathji-2",
  "Sreenathji-3",
  "Sreenathji-4",
  "Sreenathji-5",
] as const;

export type StockInwardSupplier = (typeof STOCK_INWARD_SUPPLIERS)[number];

export const DEFAULT_STOCK_INWARD_SUPPLIER: StockInwardSupplier = STOCK_INWARD_SUPPLIERS[0];

const LEGACY_STOCK_INWARD_SUPPLIERS = [
  "Hindalco Industries",
  "Jindal Aluminium",
  "Balco Extrusions",
  "National Aluminium",
] as const;

/** Map legacy mock supplier names to the current supplier list. */
export function normalizeStockInwardSupplier(supplier: string | undefined | null): StockInwardSupplier {
  const value = supplier?.trim() ?? "";
  if (STOCK_INWARD_SUPPLIERS.includes(value as StockInwardSupplier)) {
    return value as StockInwardSupplier;
  }

  const legacyIndex = LEGACY_STOCK_INWARD_SUPPLIERS.indexOf(
    value as (typeof LEGACY_STOCK_INWARD_SUPPLIERS)[number]
  );
  if (legacyIndex >= 0) {
    return STOCK_INWARD_SUPPLIERS[legacyIndex] ?? DEFAULT_STOCK_INWARD_SUPPLIER;
  }

  return DEFAULT_STOCK_INWARD_SUPPLIER;
}

export const stockInwardLengthRowSchema = z.object({
  lengthInMeter: z.coerce.number().min(0.01, "Length is required"),
  totalWeightKg: z.coerce.number().min(0.01, "Total weight is required"),
  totalProfiles: z.coerce.number().min(0.01, "NOS is required"),
});

export type StockInwardLengthRow = z.infer<typeof stockInwardLengthRowSchema>;

export const stockInwardFormSchema = z.object({
  dyeCode: z.string().trim().min(1, "Dye code is required"),
  profileCode: z.string().min(1, "Profile is required"),
  supplier: z.enum(STOCK_INWARD_SUPPLIERS, { message: "Supplier is required" }),
  date: z.string().min(1, "Date is required"),
  invoiceNo: z.string().trim(),
  totalWeightKg: z.coerce.number().min(0.01, "Total weight is required"),
  totalProfiles: z.coerce.number().min(0.01, "NOS is required"),
  lengthInMeter: z.coerce.number().min(0.01, "Length is required"),
});

export const stockInwardAddFormSchema = z
  .object({
    dyeCode: z.string().trim().min(1, "Dye code is required"),
    profileCode: z.string().min(1, "Profile is required"),
    supplier: z.enum(STOCK_INWARD_SUPPLIERS, { message: "Supplier is required" }),
    date: z.string().min(1, "Date is required"),
    invoiceNo: z.string().trim(),
    lengthRows: z.array(stockInwardLengthRowSchema).min(1, "Add at least one length"),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<number>();
    data.lengthRows.forEach((row, index) => {
      if (seen.has(row.lengthInMeter)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each length can only be added once",
          path: ["lengthRows", index, "lengthInMeter"],
        });
      }
      seen.add(row.lengthInMeter);
    });
  });

export type StockInwardFormData = z.infer<typeof stockInwardFormSchema>;
export type StockInwardAddFormData = z.infer<typeof stockInwardAddFormSchema>;

export function buildStockInwardEntry(
  data: StockInwardFormData,
  profiles: Profile[],
  base: Pick<StockInward, "id" | "inwardNo"> & Partial<StockInward>
): StockInward | null {
  const profile = resolveStockInwardProfile(profiles, data.dyeCode, data.profileCode);
  if (!profile) return null;

  const metrics = buildStockInwardMetrics(
    profile,
    data.totalWeightKg,
    data.lengthInMeter
  );

  return {
    id: base.id,
    inwardNo: base.inwardNo,
    invoiceNo: data.invoiceNo?.trim() || undefined,
    date: data.date,
    supplier: data.supplier,
    dyeCode: data.dyeCode.trim(),
    profileCode: profile.code,
    profileName: profile.name,
    totalWeightKg: data.totalWeightKg,
    lengthFeet: metrics.lengthFeet,
    length: data.lengthInMeter,
    kgPerMeter: metrics.kgPerMeter,
    rate: metrics.rate,
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
  const inwardNos = generateInwardNos(existingInward, data.lengthRows.length);

  return data.lengthRows
    .map((row, index) =>
      buildStockInwardEntry(
        {
          dyeCode: data.dyeCode,
          profileCode: data.profileCode,
          supplier: data.supplier,
          date: data.date,
          invoiceNo: data.invoiceNo,
          totalWeightKg: row.totalWeightKg,
          totalProfiles: row.totalProfiles,
          lengthInMeter: row.lengthInMeter,
        },
        profiles,
        {
          id: createId(),
          inwardNo: inwardNos[index],
        }
      )
    )
    .filter((entry): entry is StockInward => entry !== null);
}
