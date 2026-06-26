import { formatNumber } from "@/lib/utils";
import type { ChallanItem, PowderCoating, Profile, ProfilePriceHistory } from "@/types";

const PLACEHOLDER_PROFILE_IMAGE_PHOTO_ID = "photo-1581092160562";

export function isPlaceholderProfileImage(url: string | undefined | null): boolean {
  if (!url || url === "/placeholder.png") return true;
  return url.includes(PLACEHOLDER_PROFILE_IMAGE_PHOTO_ID);
}

export function sanitizeProfileImageUrl(url: string | undefined | null): string {
  if (isPlaceholderProfileImage(url)) return "";
  return url ?? "";
}

export function getProfileDesignImage(profile: Pick<Profile, "design" | "image">): string {
  for (const src of [profile.design, profile.image]) {
    if (src && !isPlaceholderProfileImage(src)) return src;
  }
  return "";
}

export function getProfileDyeCode(
  profile: Pick<Profile, "dyeCode" | "diaCode">
): string {
  return String(profile.dyeCode ?? profile.diaCode ?? "").trim();
}

export function parseProfileCodeParts(profileCode: string): {
  series: string;
  code: string;
} {
  const trimmed = profileCode.trim();
  const match = trimmed.match(/^(.*?)[-/](.+)$/);
  if (match) {
    return { series: match[1], code: match[2] };
  }
  return { series: trimmed, code: "" };
}

export function getProfileCodeValue(
  profile: Pick<Profile, "code" | "seriesName" | "profileNo">
): string {
  return profile.code || profile.seriesName || "";
}

export function getProfileSeriesAndCode(
  profile: Pick<Profile, "code" | "seriesName" | "profileNo">
): { series: string; code: string } {
  const profileCode = getProfileCodeValue(profile);
  const parsed = parseProfileCodeParts(profileCode);
  if (parsed.code) return parsed;
  return {
    series: profileCode,
    code: profile.profileNo ?? "",
  };
}

/** Series label used for filters — prefers profile master seriesName over parsed code prefix. */
export function getProfileSeriesLabel(
  profile: Pick<Profile, "code" | "seriesName" | "profileNo">
): string {
  const seriesName = profile.seriesName?.trim();
  if (seriesName) return seriesName;
  return getProfileSeriesAndCode(profile).series;
}

export function profileMatchesSeriesFilter(
  profile: Pick<Profile, "code" | "seriesName" | "profileNo">,
  seriesFilter: string
): boolean {
  if (!seriesFilter) return true;

  const label = getProfileSeriesLabel(profile);
  if (label === seriesFilter) return true;

  // Support full labels (MCW38 CURTAIN WALL) when filter is the short code (MCW38).
  if (label.startsWith(`${seriesFilter} `)) return true;

  const { series } = getProfileSeriesAndCode(profile);
  if (series === seriesFilter) return true;
  if (seriesFilter.startsWith(series)) return true;

  return false;
}

export function getUniqueProfileSeries(profiles: Profile[]): string[] {
  return [
    ...new Set(profiles.map((p) => getProfileSeriesAndCode(p).series).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
}

export function getUniqueProfileCodesForSeries(
  profiles: Profile[],
  series: string
): string[] {
  return [
    ...new Set(
      profiles
        .filter((p) => profileMatchesSeriesFilter(p, series))
        .map((p) => getProfileSeriesAndCode(p).code)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function getUniqueSeriesFromProfileCodes(profileCodes: string[]): string[] {
  return [
    ...new Set(
      profileCodes.map((code) => parseProfileCodeParts(code).series).filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function getUniqueCodesForSeriesFromProfileCodes(
  profileCodes: string[],
  series: string
): string[] {
  return [
    ...new Set(
      profileCodes
        .filter((code) => parseProfileCodeParts(code).series === series)
        .map((code) => parseProfileCodeParts(code).code)
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function matchesProfileCodeFilters(
  profileCode: string,
  seriesFilter: string,
  codeFilter: string
): boolean {
  const { series, code } = parseProfileCodeParts(profileCode);
  if (seriesFilter && series !== seriesFilter) return false;
  if (codeFilter && code !== codeFilter) return false;
  return true;
}

export function getItemProfileCodes(
  items: { profileCode?: string }[] | undefined
): string[] {
  return [...new Set((items ?? []).map((item) => item.profileCode?.trim() ?? "").filter(Boolean))];
}

export function matchesItemsProfileCodeFilters(
  items: { profileCode?: string }[] | undefined,
  seriesFilter: string,
  codeFilter: string
): boolean {
  if (!seriesFilter && !codeFilter) return true;
  return getItemProfileCodes(items).some((code) =>
    matchesProfileCodeFilters(code, seriesFilter, codeFilter)
  );
}

export function formatProfileNo(profileNo: string): string {
  const digits = profileNo.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length === 1 ? digits.padStart(2, "0") : digits;
}

export function buildProfileName(seriesName: string, profileNo: string): string {
  const formatted = formatProfileNo(profileNo);
  if (!seriesName || !formatted) return "";
  return `${seriesName}-${formatted}`;
}

export function getProfileDisplayName(profile: Pick<Profile, "name" | "seriesName" | "profileNo">): string {
  if (profile.name) return profile.name;
  return buildProfileName(profile.seriesName, profile.profileNo ?? "");
}

export function mergeProfiles(api: Profile[], store: Profile[]): Profile[] {
  const byKey = new Map<string, Profile>();

  const upsert = (profile: Profile) => {
    const code = getProfileCodeValue(profile);
    const key = code || profile.id;
    if (!key) return;
    const existing = byKey.get(key);
    byKey.set(key, existing ? coalesceProfileRecords(existing, profile) : profile);
  };

  api.forEach(upsert);
  store.forEach(upsert);
  return [...byKey.values()].map((profile) => normalizeProfile(profile));
}

export function getProfileNameList(profiles: Profile[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const profile of profiles) {
    const label = getProfileDisplayName(profile);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    names.push(label);
  }
  return names.sort((a, b) => a.localeCompare(b));
}

export interface ProfileSelectOption {
  id: string;
  value: string;
  label: string;
  name: string;
}

export function getProfileSelectOptions(profiles: Profile[]): ProfileSelectOption[] {
  const seen = new Set<string>();

  return profiles
    .map((profile) => {
      const value = getProfileCodeValue(profile);
      if (!value || seen.has(value)) return null;
      seen.add(value);
      return {
        id: profile.id,
        value,
        name: profile.name,
        label: `${value} — ${profile.name}`,
      };
    })
    .filter((option): option is ProfileSelectOption => option !== null)
    .sort((a, b) => a.value.localeCompare(b.value));
}

export function findProfileByDisplayName(
  profiles: Profile[],
  profileName: string
): Profile | undefined {
  return profiles.find((p) => getProfileDisplayName(p) === profileName);
}

export function findProfileByCode(
  profiles: Profile[],
  profileCode: string
): Profile | undefined {
  const profile = profiles.find((p) => p.code === profileCode || p.name === profileCode);
  return profile ? normalizeProfile(profile) : undefined;
}

/** Profiles that appear in powder coating batches — used for powder coating challan item pickers. */
export function getProfilesForPowderCoatingChallan(
  profiles: Profile[],
  powderCoatingEntries: PowderCoating[],
  extraCodes: string[] = []
): Profile[] {
  const codes = new Set<string>();

  for (const entry of powderCoatingEntries) {
    const code = entry.profileCode?.trim();
    if (code) codes.add(code);
  }

  for (const code of extraCodes) {
    const trimmed = code.trim();
    if (trimmed) codes.add(trimmed);
  }

  if (codes.size === 0) return [];

  return profiles.filter((profile) => codes.has(getProfileCodeValue(profile)));
}

export function getWeightPerMeter(
  profile: Pick<Profile, "purchaseUnitQty" | "conversionUnitQty">
): number {
  const purchaseQty = profile.purchaseUnitQty ?? 0;
  const conversionQty = profile.conversionUnitQty ?? 0;
  if (!conversionQty) return 0;
  return purchaseQty / conversionQty;
}

/** Weight (kg) from kg-per-meter × length (m) × qty. */
export function weightFromConversionUnit(
  profile: Pick<Profile, "purchaseUnitQty" | "conversionUnitQty">,
  item: Pick<ChallanItem, "length" | "qty">
): number {
  const kgPerMeter = getWeightPerMeter(profile);
  return Math.round(kgPerMeter * item.length * item.qty * 100) / 100;
}

/** Convert kg to meters using derived kg-per-meter. */
export function metersFromWeightKg(
  profile: Pick<Profile, "purchaseUnitQty" | "conversionUnitQty">,
  weightKg: number
): number {
  const kgPerMeter = getWeightPerMeter(profile);
  if (!kgPerMeter) return 0;
  return Math.round((weightKg / kgPerMeter) * 100) / 100;
}

/** Price per meter — alias for R MTR rate. */
export function calculatePricePerMeter(
  profile: Pick<Profile, "purchaseUnitQty" | "conversionUnitQty"> &
    Partial<Pick<Profile, "rate" | "perKgRate" | "weightPerMeter">>
): number {
  return calculateRMtrRate(profile);
}

/** R MTR rate for a profile — always derived, never a stored fixed value. */
export function resolveProfileRatePerMeter(
  profile: Pick<
    Profile,
    | "ratePerMeter"
    | "rate"
    | "perKgRate"
    | "purchaseUnitQty"
    | "conversionUnitQty"
    | "weightPerMeter"
  >
): number {
  return calculateRMtrRate(profile);
}

export function getProfileRatePerMeter(profile: Profile): number {
  return resolveProfileRatePerMeter(profile);
}

/** Canonical per-meter rate for challans — based on selected length when provided. */
export function getChallanRatePerMeter(
  profile: Pick<
    Profile,
    | "ratePerMeter"
    | "rmm"
    | "rate"
    | "perKgRate"
    | "purchaseUnitQty"
    | "conversionUnitQty"
    | "weightPerMeter"
  >,
  lengthInMeter?: number
): number {
  const ratePerKg = profile.rate ?? profile.perKgRate ?? 0;
  const length =
    lengthInMeter && lengthInMeter > 0
      ? lengthInMeter
      : profile.rmm ?? getProfileLengths(profile)[0] ?? 0;

  if (ratePerKg && length > 0) {
    const rmm = getProfileRmmValue(profile, length);
    if (rmm > 0) {
      return calculateRMtrRateFromRmmAndRate(rmm, ratePerKg);
    }
  }

  return resolveProfileRatePerMeter(profile);
}

/** Amount = length (m) × weight per meter × rate per kg × qty. */
export function calculateChallanItemAmount(
  item: Pick<ChallanItem, "length" | "qty" | "profileCode" | "rate">,
  profile?: Profile | null
): number {
  if (profile) {
    return calculateProfileItemAmount(Number(item.length) || 0, Number(item.qty) || 0, profile);
  }
  const length = Number(item.length) || 0;
  const qty = Number(item.qty) || 0;
  const rate = item.rate != null && item.rate > 0 ? item.rate : 0;
  return Math.round(length * qty * rate * 100) / 100;
}

export function getChallanItemRatePerMeter(
  item: Pick<ChallanItem, "rate" | "profileCode" | "length">,
  profile?: Profile | null
): number {
  if (profile) {
    const length = Number(item.length) || 0;
    return getChallanRatePerMeter(profile, length > 0 ? length : undefined);
  }
  if (item.rate != null && item.rate > 0) return item.rate;
  return 0;
}

export const PURCHASE_UNIT_METRICS = ["KG", "g", "m", "mm", "pcs", "ton"] as const;

export const CONVERSION_UNIT_METRIC = "Meter" as const;

/** Legacy RMM values are converted to meters by dividing by this factor. */
export const RMM_TO_METER_FACTOR = 305;

/** Multiplier used in R MTR Rate: (RMM / 305) × Rate × 3.25 */
export const R_MTR_RATE_MULTIPLIER = 3.25;

export type PurchaseUnitMetric = (typeof PURCHASE_UNIT_METRICS)[number];

export function formatPurchaseUnit(
  qty: number | undefined,
  metric: string | undefined
): string {
  if (qty == null || !metric) return "—";
  return `${qty} ${metric}`;
}

/** RMM for a profile length — uses stored purchaseUnitQty at the canonical length. */
export function getProfileRmmValue(
  profile: Pick<
    Profile,
    "purchaseUnitQty" | "rmm" | "conversionUnitQty" | "weightPerMeter"
  >,
  lengthInMeter?: number
): number {
  const lengths = getProfileLengths(profile);
  const canonicalLength = profile.rmm > 0 ? profile.rmm : lengths[0] ?? 0;
  const length =
    lengthInMeter && lengthInMeter > 0
      ? lengthInMeter
      : canonicalLength;

  if (!length) return profile.purchaseUnitQty ?? 0;

  const isCanonical =
    canonicalLength > 0 && Math.abs(length - canonicalLength) < 0.01;

  if (isCanonical && profile.purchaseUnitQty && profile.purchaseUnitQty > 0) {
    return profile.purchaseUnitQty;
  }

  return Math.round(length * RMM_TO_METER_FACTOR * 100) / 100;
}

function calculateRatePerMeter(lengthInMeter: number, rate: number): number {
  if (!lengthInMeter || !rate) return 0;
  return Math.round((lengthInMeter * rate * R_MTR_RATE_MULTIPLIER) * 100) / 100;
}

/** R MTR Rate (₹/m) = (RMM / 305) × Rate × 3.25 */
export function calculateRMtrRateFromRmmAndRate(
  rmm: number,
  ratePerKg: number
): number {
  if (!rmm || !ratePerKg) return 0;
  return (
    Math.round(
      ((rmm / RMM_TO_METER_FACTOR) * ratePerKg * R_MTR_RATE_MULTIPLIER) * 100
    ) / 100
  );
}

/** R MTR Rate from length (m) and rate per kg. */
export function calculateRMtrRateFromLengthAndRate(
  lengthInMeter: number,
  ratePerKg: number
): number {
  if (!lengthInMeter || !ratePerKg) return 0;
  return calculateRMtrRateFromRmmAndRate(
    lengthInMeter * RMM_TO_METER_FACTOR,
    ratePerKg
  );
}

/** Preview R MTR rate in add/edit forms and profile table. */
export function previewRMtrRateFromLengthAndRate(
  lengthInMeter: number,
  ratePerKg: number
): number {
  return calculateRMtrRateFromLengthAndRate(lengthInMeter, ratePerKg);
}

function roundLength(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Values above this threshold are treated as legacy RMM storage, not meters. */
export function isLengthStoredAsRmm(value: number): boolean {
  if (!value || value <= 0) return false;
  return value > 10;
}

/** Convert a legacy RMM length value to meters (MTR). Already-meter values pass through. */
export function convertRmmStorageToMeters(value: number): number {
  if (!value || value <= 0) return 0;
  return isLengthStoredAsRmm(value)
    ? roundLength(value / RMM_TO_METER_FACTOR)
    : roundLength(value);
}

function convertProfileLengthStorage(profile: Profile): Profile {
  return {
    ...profile,
    rmm: convertRmmStorageToMeters(profile.rmm ?? 0),
    standardLength: profile.standardLength
      ? convertRmmStorageToMeters(profile.standardLength)
      : profile.standardLength,
  };
}

function derivePurchaseUnitQtyFromLength(
  profile: Pick<Profile, "purchaseUnitQty">,
  lengthInMeter: number
): number {
  if (profile.purchaseUnitQty && profile.purchaseUnitQty > 0) {
    return profile.purchaseUnitQty;
  }
  if (!lengthInMeter) return 0;
  return roundLength(lengthInMeter * RMM_TO_METER_FACTOR);
}

function getStoredWeightPerMeter(
  profile: Pick<Profile, "purchaseUnitQty" | "conversionUnitQty"> &
    Partial<Pick<Profile, "weightPerMeter">>
): number {
  if (profile.weightPerMeter && profile.weightPerMeter > 0) {
    return profile.weightPerMeter;
  }
  const purchaseQty = profile.purchaseUnitQty ?? 0;
  const conversionQty = profile.conversionUnitQty ?? 0;
  if (!conversionQty) return 0;
  return purchaseQty / conversionQty;
}

export function getProfileWeightPerMeter(
  profile: Pick<Profile, "purchaseUnitQty" | "conversionUnitQty" | "weightPerMeter">
): number {
  return Math.round(getStoredWeightPerMeter(profile) * 10000) / 10000;
}

/** R MTR Rate (₹/m) = (RMM / 305) × Rate × 3.25 */
export function calculateRMtrRate(
  profile: Pick<Profile, "purchaseUnitQty" | "conversionUnitQty"> &
    Partial<Pick<Profile, "rate" | "perKgRate" | "weightPerMeter">>
): number {
  const ratePerKg = profile.rate ?? profile.perKgRate ?? 0;
  if (!ratePerKg) return 0;

  const rmm = profile.purchaseUnitQty ?? 0;
  if (rmm > 0) {
    return calculateRMtrRateFromRmmAndRate(rmm, ratePerKg);
  }

  const weightPerMeter = getStoredWeightPerMeter(profile);
  if (!weightPerMeter) return 0;
  return Math.round(weightPerMeter * ratePerKg * 100) / 100;
}

/** Amount = length (m) × weight per meter × rate per kg × qty. */
export function calculateProfileItemAmount(
  lengthInMeter: number,
  qty: number,
  profile: Pick<Profile, "purchaseUnitQty" | "conversionUnitQty"> &
    Partial<Pick<Profile, "rate" | "perKgRate" | "weightPerMeter">>
): number {
  const ratePerKg = profile.rate ?? profile.perKgRate ?? 0;
  const weightPerMeter = getStoredWeightPerMeter(profile);
  if (!lengthInMeter || !qty || !ratePerKg || !weightPerMeter) return 0;
  return Math.round(lengthInMeter * weightPerMeter * ratePerKg * qty * 100) / 100;
}

/** Reject kg/m values that were mistakenly saved as profile lengths. */
export function isLikelyWeightNotLength(
  length: number,
  profile: Pick<
    Profile,
    "rmm" | "conversionUnitQty" | "weightPerMeter" | "purchaseUnitQty"
  >
): boolean {
  const weightPerMeter = getStoredWeightPerMeter(profile);
  if (weightPerMeter && Math.abs(length - weightPerMeter) < 0.15) return true;

  const rawCandidates = [profile.rmm ?? 0]
    .map(Number)
    .filter((value) => value > 0);
  const maxRaw = rawCandidates.length ? Math.max(...rawCandidates) : 0;
  if (maxRaw > 0.5 && length < 0.05) return true;
  if (maxRaw > 2 && length < 0.1) return true;

  return false;
}

function collectProfileLengthCandidates(
  profile: Pick<
    Profile,
    "rmm" | "conversionUnitQty" | "weightPerMeter" | "purchaseUnitQty"
  >
): number[] {
  return sanitizeLengthCandidates(profile, [profile.rmm ?? 0]);
}

export function coalesceProfileRecords(first: Profile, second: Profile): Profile {
  const merged: Profile = { ...first, ...second };
  const mergedLength = Math.max(first.rmm ?? 0, second.rmm ?? 0);

  return {
    ...merged,
    rmm: mergedLength,
    purchaseUnitQty: Math.max(first.purchaseUnitQty ?? 0, second.purchaseUnitQty ?? 0),
    conversionUnitQty: Math.max(first.conversionUnitQty ?? 0, second.conversionUnitQty ?? 0),
  };
}

/** Reference length (m) used for rate — not the longest available bar length. */
function deriveCanonicalProfileLength(
  profile: Pick<
    Profile,
    "rmm" | "purchaseUnitQty" | "conversionUnitQty" | "weightPerMeter"
  >
): number {
  const fromPurchase =
    profile.purchaseUnitQty && profile.purchaseUnitQty > 0
      ? roundLength(profile.purchaseUnitQty / RMM_TO_METER_FACTOR)
      : 0;

  const storedRmm = roundLength(profile.rmm ?? 0);

  if (fromPurchase > 0 && fromPurchase <= 10) {
    if (
      storedRmm > 0 &&
      storedRmm <= 10 &&
      !isLikelyWeightNotLength(storedRmm, profile) &&
      Math.abs(storedRmm - fromPurchase) / fromPurchase <= 0.25
    ) {
      return storedRmm;
    }
    return fromPurchase;
  }

  if (storedRmm > 0 && storedRmm <= 10 && !isLikelyWeightNotLength(storedRmm, profile)) {
    return storedRmm;
  }

  const barLengths = collectProfileLengthCandidates(profile).filter((length) => length <= 10);
  return barLengths.length ? Math.min(...barLengths) : storedRmm;
}

function sanitizeLengthCandidates(
  profile: Pick<
    Profile,
    "rmm" | "conversionUnitQty" | "weightPerMeter" | "purchaseUnitQty"
  >,
  candidates: number[]
): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const raw of candidates) {
    const value = roundLength(Number(raw));
    if (!value || value <= 0 || seen.has(value)) continue;
    if (isLikelyWeightNotLength(value, profile)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

export function normalizeProfileLengths(
  profile: Pick<
    Profile,
    "rmm" | "conversionUnitQty" | "weightPerMeter" | "purchaseUnitQty"
  >
): number[] {
  const valid = collectProfileLengthCandidates(profile);
  return [...valid].sort((a, b) => a - b);
}

export function getProfileLengths(
  profile: Pick<
    Profile,
    "rmm" | "conversionUnitQty" | "weightPerMeter" | "purchaseUnitQty"
  > | null | undefined
): number[] {
  if (!profile) return [];
  return normalizeProfileLengths(profile);
}

export function getPrimaryProfileLength(
  profile: Pick<
    Profile,
    "rmm" | "conversionUnitQty" | "weightPerMeter" | "purchaseUnitQty"
  > | null | undefined
): number {
  if (!profile) return 0;
  const valid = collectProfileLengthCandidates(profile);
  return valid.length > 0 ? Math.max(...valid) : 0;
}

export function getProfileLengthOptions(
  profile: Pick<
    Profile,
    "rmm" | "conversionUnitQty" | "weightPerMeter" | "purchaseUnitQty"
  > | null | undefined
): number[] {
  return getProfileLengths(profile);
}

export function formatProfileLengthLabel(lengthInMeter: number): string {
  return `${formatNumber(lengthInMeter, 2)} m`;
}

export function deriveConversionUnitQty(
  lengthInMeter: number,
  rate: number,
  ratePerMeter: number
): number {
  if (!ratePerMeter) return 1;
  const effectiveRmm = lengthInMeter * RMM_TO_METER_FACTOR;
  return Math.round(((effectiveRmm * rate) / ratePerMeter) * 100) / 100;
}

export function buildProfileFromForm(
  data: {
    seriesName: string;
    profileCode: string;
    dyeCode?: string;
    itemName: string;
    powderCoatingRmm: number;
    kgPerMeter: number;
  },
  image: string,
  id?: string,
  createdAt?: string
): Profile {
  const primaryLength =
    data.powderCoatingRmm > 0
      ? roundLength(data.powderCoatingRmm / RMM_TO_METER_FACTOR)
      : 0;
  const purchaseUnitQty = primaryLength
    ? roundLength(primaryLength * RMM_TO_METER_FACTOR)
    : data.powderCoatingRmm > 0
      ? roundLength(data.powderCoatingRmm)
      : 0;
  const profileNoMatch = data.profileCode.match(/[-/](.+)$/);
  const profileNo = profileNoMatch?.[1] ?? "1";

  return {
    id: id ?? `prf-${Date.now().toString(36)}`,
    code: data.profileCode,
    name: data.itemName,
    seriesName: data.seriesName,
    profileNo,
    dyeCode: data.dyeCode?.trim() || undefined,
    rmm: primaryLength,
    powderCoatingRmm: data.powderCoatingRmm,
    ratePerMeter: 0,
    category: "",
    alloy: "",
    finish: "",
    weightPerMeter: Math.round(data.kgPerMeter * 10000) / 10000,
    standardLength: primaryLength,
    image,
    design: image,
    designName: data.itemName,
    purchaseUnitQty,
    purchaseUnitMetric: "KG",
    conversionUnitQty: 0,
    conversionUnitMetric: CONVERSION_UNIT_METRIC,
    description: data.itemName,
    minStock: 0,
    currentStock: 0,
    unit: "pcs",
    status: "active",
    createdAt: createdAt ?? new Date().toISOString().split("T")[0],
  };
}

export function normalizeProfile(profile: Profile): Profile {
  const base = convertProfileLengthStorage(profile);
  const {
    rate: _rate,
    perKgRate: _perKgRate,
    priceHistory: _priceHistory,
    ...baseWithoutRate
  } = base;
  const canonicalLength = deriveCanonicalProfileLength(baseWithoutRate);
  const purchaseUnitQty = derivePurchaseUnitQtyFromLength(baseWithoutRate, canonicalLength);

  return {
    ...baseWithoutRate,
    dyeCode: getProfileDyeCode(baseWithoutRate) || undefined,
    rmm: canonicalLength,
    powderCoatingRmm: baseWithoutRate.powderCoatingRmm ?? 0,
    ratePerMeter: 0,
    weightPerMeter: getProfileWeightPerMeter(baseWithoutRate),
    standardLength: canonicalLength,
    purchaseUnitQty,
    conversionUnitQty: baseWithoutRate.conversionUnitQty ?? 0,
    image: sanitizeProfileImageUrl(baseWithoutRate.image),
    design: sanitizeProfileImageUrl(baseWithoutRate.design),
  };
}

export function getProfileStatusLabel(status: Profile["status"] | undefined): string {
  if (status === "inactive") return "Inactive";
  return status ?? "active";
}

export function formatPerKgRate(rate: number | undefined | null): string {
  if (rate == null || Number.isNaN(rate)) return "—";
  return formatCurrency(rate);
}

export function formatRateValue(rate: number | undefined | null): string {
  if (rate == null || Number.isNaN(rate)) return "—";
  return formatNumber(rate, 2);
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return `₹${formatNumber(amount, 2)}`;
}

export function formatPricePerMeter(
  profile: Pick<Profile, "perKgRate" | "purchaseUnitQty" | "conversionUnitQty">
): string {
  return formatCurrency(calculatePricePerMeter(profile));
}

export function createPriceHistoryEntry(
  previousRate: number | null,
  newRate: number,
  id?: string
): ProfilePriceHistory {
  return {
    id: id ?? `ph-${Date.now().toString(36)}`,
    date: new Date().toISOString().split("T")[0],
    previousRate,
    newRate,
  };
}

export function buildInitialPriceHistory(perKgRate: number): ProfilePriceHistory[] {
  return [createPriceHistoryEntry(null, perKgRate)];
}

export function appendPriceHistory(
  history: ProfilePriceHistory[] | undefined,
  previousRate: number,
  newRate: number
): ProfilePriceHistory[] {
  if (previousRate === newRate) return history ?? [];
  return [...(history ?? []), createPriceHistoryEntry(previousRate, newRate)];
}
