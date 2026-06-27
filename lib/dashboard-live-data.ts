import type { DashboardStats } from "@/types";
import type { Challan, PowderCoating, Profile, StockInward } from "@/types";
import {
  buildStockConsumptionFromChallans,
  filterVisibleChallans,
} from "@/lib/challan-consumption";
import {
  getDateRangeForTimeframe,
  type DashboardTimeframe,
  type DateRange,
} from "@/lib/dashboard-timeframe";
import { mergeProfiles } from "@/lib/profile";
import { buildStockMasterRows, mergeStockInward } from "@/lib/stock-master";
import { normalizeStockInwardRecord } from "@/lib/stock-inward-calculations";
import { DEFAULT_APP_SETTINGS } from "@/lib/app-settings";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export interface DashboardChartsData {
  inventoryOverview: { category: string; stock: number }[];
  monthlyStockMovement: { month: string; inward: number; outward: number }[];
  consumptionTrends: { week: string; consumption: number }[];
  colorDistribution: { color: string; count: number; fill?: string }[];
}

export interface DashboardLiveData {
  stats: DashboardStats;
  charts: DashboardChartsData;
}

export interface BuildDashboardLiveDataInput {
  profiles: Profile[];
  apiProfiles?: Profile[];
  inward: StockInward[];
  apiInward?: StockInward[];
  deletedStockInwardIds?: string[];
  apiChallans: Challan[];
  storeChallans: Challan[];
  powderCoating: PowderCoating[];
  timeframe: DashboardTimeframe;
  lowStockThresholdKg?: number;
  reference?: Date;
}

function parseRecordDate(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isInRange(dateValue: string | undefined, range: DateRange): boolean {
  const date = parseRecordDate(dateValue);
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

function monthLabel(date: Date): string {
  return MONTH_LABELS[date.getMonth()] ?? "Jan";
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function weekLabel(date: Date): string {
  const weekStart = startOfWeek(date);
  const month = MONTH_LABELS[weekStart.getMonth()];
  return `${month} W${Math.ceil(weekStart.getDate() / 7)}`;
}

const COLOR_FILLS: Record<string, string> = {
  White: "#f8fafc",
  Black: "#1e293b",
  Blue: "#2563eb",
  Yellow: "#ca8a04",
  Green: "#16a34a",
  "Matt Black": "#334155",
  "Dark Bronze": "#78350f",
  "Champagne Gold": "#ca8a04",
  "Wood Finish": "#92400e",
};

export function buildDashboardLiveData({
  profiles,
  apiProfiles = [],
  inward,
  apiInward = [],
  deletedStockInwardIds = [],
  apiChallans,
  storeChallans,
  powderCoating,
  timeframe,
  lowStockThresholdKg = DEFAULT_APP_SETTINGS.lowStockThresholdKg,
  reference = new Date(),
}: BuildDashboardLiveDataInput): DashboardLiveData {
  const range = getDateRangeForTimeframe(timeframe, reference);
  const mergedProfiles = mergeProfiles(apiProfiles, profiles);
  const activeProfiles = mergedProfiles.filter((profile) => profile.status !== "inactive");

  const mergedInward = mergeStockInward(
    apiInward.map(normalizeStockInwardRecord),
    inward.map(normalizeStockInwardRecord),
    deletedStockInwardIds
  ).filter((entry) => entry.status !== "split");

  const visibleChallans = filterVisibleChallans(
    [...apiChallans, ...storeChallans].reduce<Challan[]>((acc, challan) => {
      if (!challan?.id) return acc;
      const existing = acc.find((item) => item.id === challan.id);
      if (existing) Object.assign(existing, challan);
      else acc.push({ ...challan });
      return acc;
    }, [])
  );

  const consumption = buildStockConsumptionFromChallans(apiChallans, storeChallans);
  const stockRows = buildStockMasterRows(mergedInward, consumption);

  const availableStock =
    Math.round(stockRows.reduce((sum, row) => sum + (row.totalProfiles ?? 0), 0) * 100) /
    100;

  const lowStockProfiles = stockRows.filter(
    (row) => row.stockKg > 0 && row.stockKg <= lowStockThresholdKg
  ).length;

  const rangedConsumption = consumption.filter((entry) => isInRange(entry.date, range));
  const totalConsumption =
    Math.round(
      rangedConsumption.reduce((sum, entry) => sum + Math.abs(entry.quantity ?? 0), 0) * 100
    ) / 100;

  const rangedPowder = powderCoating.filter((entry) => isInRange(entry.date, range));
  const pendingCoating = rangedPowder.filter((entry) => !entry.returnDate?.trim()).length;
  const completedCoating = rangedPowder.filter((entry) => entry.returnDate?.trim()).length;

  const profileByCode = new Map(mergedProfiles.map((profile) => [profile.code, profile]));
  const inventoryBuckets = new Map<string, number>();
  for (const row of stockRows) {
    if (row.totalProfiles <= 0) continue;
    const profile = profileByCode.get(row.profileCode);
    const category = profile?.seriesName?.trim() || profile?.name?.trim() || "Uncategorized";
    inventoryBuckets.set(category, (inventoryBuckets.get(category) ?? 0) + row.totalProfiles);
  }

  const inventoryOverview = Array.from(inventoryBuckets.entries())
    .map(([category, stock]) => ({
      category,
      stock: Math.round(stock * 100) / 100,
    }))
    .sort((a, b) => b.stock - a.stock);

  const monthlyBuckets = new Map<string, { inward: number; outward: number }>();
  for (const entry of mergedInward) {
    if (!isInRange(entry.date, range)) continue;
    const date = parseRecordDate(entry.date);
    if (!date) continue;
    const label = monthLabel(date);
    const bucket = monthlyBuckets.get(label) ?? { inward: 0, outward: 0 };
    bucket.inward += entry.totalWeightKg ?? entry.weight ?? 0;
    monthlyBuckets.set(label, bucket);
  }

  for (const entry of rangedConsumption) {
    const date = parseRecordDate(entry.date);
    if (!date) continue;
    const label = monthLabel(date);
    const bucket = monthlyBuckets.get(label) ?? { inward: 0, outward: 0 };
    bucket.outward += Math.abs(entry.weight ?? 0);
    monthlyBuckets.set(label, bucket);
  }

  const monthlyStockMovement = MONTH_LABELS.filter((month) => monthlyBuckets.has(month)).map(
    (month) => {
      const bucket = monthlyBuckets.get(month)!;
      return {
        month,
        inward: Math.round(bucket.inward),
        outward: Math.round(bucket.outward),
      };
    }
  );

  const consumptionBuckets = new Map<string, number>();
  for (const entry of rangedConsumption) {
    const date = parseRecordDate(entry.date);
    if (!date) continue;
    const label = weekLabel(date);
    consumptionBuckets.set(
      label,
      (consumptionBuckets.get(label) ?? 0) + Math.abs(entry.quantity ?? 0)
    );
  }

  const consumptionTrends = Array.from(consumptionBuckets.entries()).map(
    ([week, consumptionValue]) => ({
      week,
      consumption: Math.round(consumptionValue * 100) / 100,
    })
  );

  const colorBuckets = new Map<string, number>();
  for (const entry of rangedPowder) {
    const color = entry.color?.trim() || "Unknown";
    colorBuckets.set(color, (colorBuckets.get(color) ?? 0) + (entry.quantity ?? 0));
  }

  for (const challan of visibleChallans) {
    if (challan.type !== "powder_coating" || !isInRange(challan.date, range)) continue;
    const color =
      ("color" in challan && challan.color?.trim()) || "Unknown";
    const qty = (challan.items ?? []).reduce((sum, item) => sum + (item.qty ?? 0), 0);
    colorBuckets.set(color, (colorBuckets.get(color) ?? 0) + qty);
  }

  const colorDistribution = Array.from(colorBuckets.entries()).map(([color, count]) => ({
    color,
    count: Math.round(count * 100) / 100,
    fill: COLOR_FILLS[color],
  }));

  return {
    stats: {
      totalProfiles: activeProfiles.length,
      availableStock,
      lowStockProfiles,
      totalConsumption,
      pendingCoating,
      completedCoating,
      scrapQuantity: 0,
    },
    charts: {
      inventoryOverview,
      monthlyStockMovement,
      consumptionTrends,
      colorDistribution,
    },
  };
}

export function getDashboardChartData(
  charts: DashboardChartsData,
  chartId: keyof DashboardChartsData
): unknown[] {
  return charts[chartId] ?? [];
}
