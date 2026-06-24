import { z } from "zod";
import type { ReportType } from "@/types";

export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "stock_movement", label: "Stock Movement" },
  { value: "consumption", label: "Consumption Trends" },
  { value: "coating", label: "Coating & Color" },
  { value: "inventory", label: "Inventory by Category" },
  { value: "summary", label: "Summary Dashboard" },
];

export const reportFormSchema = z
  .object({
    name: z.string().min(1, "Report name is required"),
    type: z.enum(["stock_movement", "consumption", "coating", "inventory", "summary"]),
    dateFrom: z.string().min(1, "Start date is required"),
    dateTo: z.string().min(1, "End date is required"),
  })
  .refine((data) => data.dateFrom <= data.dateTo, {
    message: "End date must be on or after start date",
    path: ["dateTo"],
  });

export type ReportFormData = z.infer<typeof reportFormSchema>;

export function createReportFormSchema(existingNames: string[] = []) {
  const takenNames = new Set(
    existingNames.map((name) => name.trim().toLowerCase()).filter(Boolean)
  );

  return reportFormSchema.refine(
    (data) => !takenNames.has(data.name.trim().toLowerCase()),
    {
      message: "A report with this name already exists",
      path: ["name"],
    }
  );
}

export function isDuplicateReportName(
  name: string,
  existingNames: string[],
  ignoreName?: string
): boolean {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return false;
  const ignore = ignoreName?.trim().toLowerCase();
  return existingNames.some((existing) => {
    const existingNormalized = existing.trim().toLowerCase();
    if (!existingNormalized) return false;
    if (ignore && existingNormalized === ignore) return false;
    return existingNormalized === normalized;
  });
}

export function generateReportNo(existing: { reportNo: string }[]): string {
  const year = new Date().getFullYear();
  const prefix = `RPT-${year}-`;
  const nums = existing
    .map((entry) => {
      const match = entry.reportNo.match(/RPT-\d{4}-(\d+)/);
      return match ? Number(match[1]) : 0;
    })
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export function getReportTypeLabel(type: ReportType): string {
  return REPORT_TYPES.find((entry) => entry.value === type)?.label ?? type;
}
