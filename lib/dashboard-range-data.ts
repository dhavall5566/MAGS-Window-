import type { DashboardStats } from "@/types";
import {
  dashboardCharts,
  MOCK_DASHBOARD_STATS,
} from "@/lib/mock-data/dashboard-stats";
import {
  type DashboardTimeframe,
  type DateRange,
  endOfDay,
  getDateRangeForTimeframe,
  startOfDay,
} from "@/lib/dashboard-timeframe";

const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

type MonthlyRow = { month: string; inward: number; outward: number; coating: number };
type ConsumptionRow = { week: string; consumption: number };
type ColorRow = { color: string; count: number; fill: string };

function monthIndex(label: string): number {
  const idx = MONTH_ORDER.indexOf(label as (typeof MONTH_ORDER)[number]);
  return idx >= 0 ? idx : 0;
}

function monthStart(year: number, label: string): Date {
  return startOfDay(new Date(year, monthIndex(label), 1));
}

function monthEnd(year: number, label: string): Date {
  return endOfDay(new Date(year, monthIndex(label) + 1, 0));
}

function overlapRatio(rangeStart: Date, rangeEnd: Date, periodStart: Date, periodEnd: Date): number {
  const start = Math.max(rangeStart.getTime(), periodStart.getTime());
  const end = Math.min(rangeEnd.getTime(), periodEnd.getTime());
  if (end < start) return 0;

  const overlapMs = end - start + 1;
  const periodMs = periodEnd.getTime() - periodStart.getTime() + 1;
  return Math.min(1, overlapMs / periodMs);
}

function scaleMonthlyRow(row: MonthlyRow, ratio: number): MonthlyRow {
  if (ratio >= 0.999) return row;
  return {
    ...row,
    inward: Math.round(row.inward * ratio),
    outward: Math.round(row.outward * ratio),
    coating: Math.round(row.coating * ratio),
  };
}

function scaleConsumptionRow(row: ConsumptionRow, ratio: number): ConsumptionRow {
  if (ratio >= 0.999) return row;
  return {
    ...row,
    consumption: Math.round(row.consumption * ratio),
  };
}

function filterMonthlyMovement(rows: MonthlyRow[], range: DateRange, year: number): MonthlyRow[] {
  return rows
    .map((row) => {
      const ratio = overlapRatio(
        range.start,
        range.end,
        monthStart(year, row.month),
        monthEnd(year, row.month)
      );
      if (ratio <= 0) return null;
      return scaleMonthlyRow(row, ratio);
    })
    .filter((row): row is MonthlyRow => row !== null);
}

function filterConsumptionTrends(rows: ConsumptionRow[], range: DateRange, reference: Date): ConsumptionRow[] {
  const totalWeeks = rows.length;
  if (totalWeeks === 0) return rows;

  const rangeMs = range.end.getTime() - range.start.getTime() + 1;
  const anchorEnd = endOfDay(reference);
  const windowStart = new Date(anchorEnd.getTime() - totalWeeks * 7 * 24 * 60 * 60 * 1000 + 1);

  return rows
    .map((row, index) => {
      const weekStart = new Date(windowStart.getTime() + index * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = endOfDay(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000));
      const ratio = overlapRatio(range.start, range.end, weekStart, weekEnd);
      if (ratio <= 0) return null;
      return scaleConsumptionRow(row, ratio);
    })
    .filter((row): row is ConsumptionRow => row !== null);
}

function sumMonthly(rows: MonthlyRow[], key: keyof Pick<MonthlyRow, "inward" | "outward" | "coating">): number {
  return rows.reduce((sum, row) => sum + row[key], 0);
}

function sumConsumption(rows: ConsumptionRow[]): number {
  return rows.reduce((sum, row) => sum + row.consumption, 0);
}

function sumColors(rows: ColorRow[]): number {
  return rows.reduce((sum, row) => sum + row.count, 0);
}

function scaleColors(rows: ColorRow[], ratio: number): ColorRow[] {
  if (ratio >= 0.999) return rows;
  return rows.map((row) => ({
    ...row,
    count: Math.max(1, Math.round(row.count * ratio)),
  }));
}

function periodRatio(range: DateRange, reference: Date): number {
  const fyRange = getDateRangeForTimeframe("financial-year", reference);
  const selectedDays =
    (range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000) + 1;
  const fyDays =
    (fyRange.end.getTime() - fyRange.start.getTime()) / (24 * 60 * 60 * 1000) + 1;
  return Math.min(1, selectedDays / fyDays);
}

export function buildDashboardPayloadForRange(
  timeframe: DashboardTimeframe,
  reference = new Date()
): {
  stats: DashboardStats;
  charts: typeof dashboardCharts;
} {
  const range = getDateRangeForTimeframe(timeframe, reference);
  const year = reference.getFullYear();

  const monthly = filterMonthlyMovement(
    dashboardCharts.monthlyStockMovement as MonthlyRow[],
    range,
    year
  );
  const consumption = filterConsumptionTrends(
    dashboardCharts.consumptionTrends as ConsumptionRow[],
    range,
    reference
  );

  const coatingTotal = sumMonthly(monthly, "coating");
  const coatingRatio = periodRatio(range, reference);
  const colorRows = dashboardCharts.colorDistribution as ColorRow[];
  const colorTotal = sumColors(colorRows);
  const scaledColors =
    coatingTotal > 0
      ? scaleColors(colorRows, coatingTotal / Math.max(colorTotal, 1))
      : scaleColors(colorRows, coatingRatio);

  const stats: DashboardStats = {
    totalProfiles: MOCK_DASHBOARD_STATS.totalProfiles,
    availableStock: MOCK_DASHBOARD_STATS.availableStock,
    lowStockProfiles: MOCK_DASHBOARD_STATS.lowStockProfiles,
    totalConsumption:
      sumConsumption(consumption) ||
      Math.round((MOCK_DASHBOARD_STATS.totalConsumption ?? 0) * coatingRatio),
    pendingCoating: Math.max(
      0,
      Math.round((MOCK_DASHBOARD_STATS.pendingCoating ?? 0) * coatingRatio)
    ),
    completedCoating: Math.max(
      0,
      Math.round((MOCK_DASHBOARD_STATS.completedCoating ?? 0) * coatingRatio)
    ),
    scrapQuantity: Math.max(
      0,
      Math.round((MOCK_DASHBOARD_STATS.scrapQuantity ?? 0) * coatingRatio)
    ),
  };

  return {
    stats,
    charts: {
      inventoryOverview: dashboardCharts.inventoryOverview,
      monthlyStockMovement: monthly,
      consumptionTrends: consumption.length > 0 ? consumption : dashboardCharts.consumptionTrends,
      colorDistribution: scaledColors,
    },
  };
}
