import {
  findProfileByCode,
  getProfileCodeValue,
  getProfileDesignImage,
  getProfileDyeCode,
  getProfileWeightPerMeter,
  computeLineWeightKg,
} from "@/lib/profile";
import { formatNumber } from "@/lib/utils";
import type { Profile, StockInward } from "@/types";

/** Fallback kg/m when profile weight is unavailable. */
export const STOCK_INWARD_KG_PER_METER = 2.5;

/** Display precision for profile length in meters across stock screens. */
export const STOCK_LENGTH_DECIMALS = 2;

export function formatStockLength(lengthInMeter: number | undefined | null): string {
  return formatNumber(lengthInMeter ?? 0, STOCK_LENGTH_DECIMALS);
}

export const NOS_LABEL = "NOS";

export const NOS_FORMULA =
  "Total Weight (kg) = Length (m) × NOS × KG/MTR. Enter any two values and the third updates automatically.";

/** @deprecated Use NOS_FORMULA */
export const TOTAL_PROFILES_FORMULA = NOS_FORMULA;

/** Explicit dye code → profile code map. Add entries here as more codes are defined. */
export const STOCK_INWARD_DYE_CODE_TO_PROFILE: Record<string, string> = {
  "01": "M25-01",
  "02": "SL150-01",
};

export function normalizeDyeCode(dyeCode: string): string {
  const trimmed = dyeCode.trim();
  if (!trimmed) return "";
  if (/^\d+$/.test(trimmed)) return trimmed.padStart(2, "0");
  return trimmed;
}

/** Resolve profiles by dye code (numeric pad or profile dyeCode field). */
export function findProfilesByDyeCode(profiles: Profile[], dyeCode: string): Profile[] {
  const normalized = normalizeDyeCode(dyeCode);
  if (!normalized) return [];

  const byDyeCode = profiles.filter((item) => {
    const profileDye = getProfileDyeCode(item);
    return profileDye === normalized || profileDye === dyeCode.trim();
  });
  if (byDyeCode.length > 0) return byDyeCode;

  const mappedCode = STOCK_INWARD_DYE_CODE_TO_PROFILE[normalized];
  if (!mappedCode) return [];

  const profile = profiles.find((item) => getProfileCodeValue(item) === mappedCode);
  return profile ? [profile] : [];
}

export function findProfileByDyeCode(
  profiles: Profile[],
  dyeCode: string
): Profile | undefined {
  return findProfilesByDyeCode(profiles, dyeCode)[0];
}

export function getStockInwardKgPerMeter(profile?: Profile | null): number {
  if (!profile) return 0;
  const value = getProfileWeightPerMeter(profile);
  return value > 0 ? value : STOCK_INWARD_KG_PER_METER;
}

/** Weight per profile (kg) = length (m) × KG/MTR. */
export function calculatePerProfileWeightKg(
  lengthInMeter: number,
  kgPerMeter: number
): number {
  return computeLineWeightKg(kgPerMeter, lengthInMeter, 1, "M");
}

/** NOS = total weight (kg) ÷ (length (m) × KG/MTR). */
export function calculateTotalProfiles(
  totalWeightKg: number,
  lengthInMeter: number,
  kgPerMeter: number
): number {
  const perUnitWeight = calculatePerProfileWeightKg(lengthInMeter, kgPerMeter);
  if (!totalWeightKg || !perUnitWeight) return 0;
  return Math.round((totalWeightKg / perUnitWeight) * 100) / 100;
}

/** Total weight (kg) = length (m) × NOS × KG/MTR. */
export function calculateTotalWeightKg(
  totalProfiles: number,
  lengthInMeter: number,
  kgPerMeter: number
): number {
  return computeLineWeightKg(kgPerMeter, lengthInMeter, totalProfiles, "M");
}

export function syncStockInwardFromWeight(
  totalWeightKg: number,
  lengthInMeter: number,
  kgPerMeter: number
): { totalWeightKg: number; totalProfiles: number } {
  return {
    totalWeightKg,
    totalProfiles: calculateTotalProfiles(totalWeightKg, lengthInMeter, kgPerMeter),
  };
}

export function syncStockInwardFromProfiles(
  totalProfiles: number,
  lengthInMeter: number,
  kgPerMeter: number
): { totalWeightKg: number; totalProfiles: number } {
  return {
    totalProfiles,
    totalWeightKg: calculateTotalWeightKg(totalProfiles, lengthInMeter, kgPerMeter),
  };
}

export function syncStockInwardAfterLengthChange(
  lengthInMeter: number,
  totalWeightKg: number,
  totalProfiles: number,
  kgPerMeter: number
): { totalWeightKg: number; totalProfiles: number } {
  if (totalWeightKg > 0) {
    return syncStockInwardFromWeight(totalWeightKg, lengthInMeter, kgPerMeter);
  }
  if (totalProfiles > 0) {
    return syncStockInwardFromProfiles(totalProfiles, lengthInMeter, kgPerMeter);
  }
  return { totalWeightKg: 0, totalProfiles: 0 };
}

export function buildStockInwardMetrics(
  profile: Profile | null | undefined,
  totalWeightKg: number,
  lengthInMeter: number
) {
  const kgPerMeter = getStockInwardKgPerMeter(profile);
  const totalProfiles = calculateTotalProfiles(totalWeightKg, lengthInMeter, kgPerMeter);

  return {
    lengthInMeter,
    kgPerMeter,
    totalProfiles,
    perProfileWeightKg: calculatePerProfileWeightKg(lengthInMeter, kgPerMeter),
  };
}

export function resolveStockInwardProfile(
  profiles: Profile[],
  dyeCode: string,
  profileCode?: string
): Profile | undefined {
  if (profileCode) {
    const byCode = findProfileByCode(profiles, profileCode);
    if (byCode) return byCode;
  }
  return findProfileByDyeCode(profiles, dyeCode);
}

export function normalizeStockInwardRecord(entry: StockInward): StockInward {
  const totalWeightKg = entry.totalWeightKg ?? entry.weight ?? 0;
  const totalWeightManualKg =
    entry.totalWeightManualKg != null && entry.totalWeightManualKg > 0
      ? Math.round(entry.totalWeightManualKg * 100) / 100
      : undefined;
  const lengthInMeter = Number(entry.length) || 0;
  const kgPerMeter = entry.kgPerMeter ?? STOCK_INWARD_KG_PER_METER;
  const quantity =
    entry.quantity ??
    calculateTotalProfiles(totalWeightKg, lengthInMeter, kgPerMeter);

  const normalized: StockInward = {
    ...entry,
    dyeCode: entry.dyeCode?.trim() ?? "",
    invoiceNo: entry.invoiceNo?.trim() || undefined,
    profileImage: entry.profileImage?.trim() || undefined,
    totalWeightKg,
    totalWeightManualKg,
    length: lengthInMeter,
    kgPerMeter,
    quantity,
    weight: totalWeightKg,
  };

  if (!totalWeightManualKg) {
    delete normalized.totalWeightManualKg;
  }

  delete (normalized as { lengthFeet?: number }).lengthFeet;
  delete (normalized as { rate?: number }).rate;

  return normalized;
}

export function getStockInwardProfileImage(
  entry: Pick<StockInward, "profileImage" | "profileCode">,
  profile?: Profile | null
): string {
  const direct = entry.profileImage?.trim();
  if (direct) return direct;
  if (profile) return getProfileDesignImage(profile);
  return "";
}
