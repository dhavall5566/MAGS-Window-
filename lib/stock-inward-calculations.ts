import { findProfileByCode, getProfileCodeValue, getProfileDyeCode } from "@/lib/profile";
import type { Profile, StockInward } from "@/types";

/** Fixed kg/m for stock inward until profile-specific values are enabled. */
export const STOCK_INWARD_KG_PER_METER = 2.5;

export const NOS_LABEL = "NOS";

export const NOS_FORMULA =
  "NOS = Total Weight (kg) ÷ (Length (m) × Kg per meter). Enter either value and the other updates automatically.";

/** @deprecated Use NOS_FORMULA */
export const TOTAL_PROFILES_FORMULA = NOS_FORMULA;

export const FEET_TO_METER = 0.3048;

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

export function feetToMeters(feet: number): number {
  if (!Number.isFinite(feet) || feet <= 0) return 0;
  return Math.round(feet * FEET_TO_METER * 10000) / 10000;
}

export function metersToFeet(meters: number): number {
  if (!Number.isFinite(meters) || meters <= 0) return 0;
  return Math.round((meters / FEET_TO_METER) * 10000) / 10000;
}

export function getStockInwardKgPerMeter(_profile?: Profile | null): number {
  return STOCK_INWARD_KG_PER_METER;
}

export function getStockInwardRate(profile?: Profile | null): number {
  if (!profile) return 0;
  return profile.rate ?? profile.perKgRate ?? 0;
}

export function calculatePerProfileWeightKg(
  lengthInMeter: number,
  kgPerMeter: number
): number {
  if (!lengthInMeter || !kgPerMeter) return 0;
  return Math.round(lengthInMeter * kgPerMeter * 100) / 100;
}

export function calculateTotalProfiles(
  totalWeightKg: number,
  lengthInMeter: number,
  kgPerMeter: number
): number {
  const perProfileWeight = calculatePerProfileWeightKg(lengthInMeter, kgPerMeter);
  if (!totalWeightKg || !perProfileWeight) return 0;
  return Math.round((totalWeightKg / perProfileWeight) * 100) / 100;
}

export function calculateTotalWeightKg(
  totalProfiles: number,
  lengthInMeter: number,
  kgPerMeter: number
): number {
  const perProfileWeight = calculatePerProfileWeightKg(lengthInMeter, kgPerMeter);
  if (!totalProfiles || !perProfileWeight) return 0;
  return Math.round(totalProfiles * perProfileWeight * 100) / 100;
}

export function syncStockInwardFromWeight(
  totalWeightKg: number,
  lengthInMeter: number,
  profile?: Profile | null
): { totalWeightKg: number; totalProfiles: number } {
  const kgPerMeter = getStockInwardKgPerMeter(profile);
  return {
    totalWeightKg,
    totalProfiles: calculateTotalProfiles(totalWeightKg, lengthInMeter, kgPerMeter),
  };
}

export function syncStockInwardFromProfiles(
  totalProfiles: number,
  lengthInMeter: number,
  profile?: Profile | null
): { totalWeightKg: number; totalProfiles: number } {
  const kgPerMeter = getStockInwardKgPerMeter(profile);
  return {
    totalProfiles,
    totalWeightKg: calculateTotalWeightKg(totalProfiles, lengthInMeter, kgPerMeter),
  };
}

export function syncStockInwardAfterLengthChange(
  lengthInMeter: number,
  totalWeightKg: number,
  totalProfiles: number,
  profile?: Profile | null
): { totalWeightKg: number; totalProfiles: number } {
  if (totalWeightKg > 0) {
    return syncStockInwardFromWeight(totalWeightKg, lengthInMeter, profile);
  }
  if (totalProfiles > 0) {
    return syncStockInwardFromProfiles(totalProfiles, lengthInMeter, profile);
  }
  return { totalWeightKg: 0, totalProfiles: 0 };
}

export function buildStockInwardMetrics(
  profile: Profile | null | undefined,
  totalWeightKg: number,
  lengthInMeter: number
) {
  const kgPerMeter = getStockInwardKgPerMeter(profile);
  const rate = getStockInwardRate(profile);
  const totalProfiles = calculateTotalProfiles(totalWeightKg, lengthInMeter, kgPerMeter);

  return {
    lengthInMeter,
    lengthFeet: metersToFeet(lengthInMeter),
    kgPerMeter,
    rate,
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
  const lengthFeet =
    entry.lengthFeet ?? (entry.length ? metersToFeet(entry.length) : 0);
  const lengthInMeter = entry.length ?? feetToMeters(lengthFeet);
  const kgPerMeter = entry.kgPerMeter ?? STOCK_INWARD_KG_PER_METER;
  const rate = entry.rate ?? 0;
  const quantity =
    entry.quantity ??
    calculateTotalProfiles(totalWeightKg, lengthInMeter, kgPerMeter);

  return {
    ...entry,
    dyeCode: entry.dyeCode?.trim() ?? "",
    invoiceNo: entry.invoiceNo?.trim() || undefined,
    totalWeightKg,
    lengthFeet,
    length: lengthInMeter,
    kgPerMeter,
    rate,
    quantity,
    weight: totalWeightKg,
  };
}
