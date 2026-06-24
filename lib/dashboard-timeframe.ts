export type DashboardTimeframe =
  | "today"
  | "7d"
  | "30d"
  | "this-month"
  | "3m"
  | "this-quarter"
  | "financial-year";

export const DASHBOARD_TIMEFRAMES: { value: DashboardTimeframe; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "this-month", label: "This Month" },
  { value: "3m", label: "Last 3 Months" },
  { value: "this-quarter", label: "This Quarter" },
  { value: "financial-year", label: "Financial Year" },
];

const TIMEFRAME_SET = new Set(DASHBOARD_TIMEFRAMES.map((t) => t.value));

export function isDashboardTimeframe(value: string): value is DashboardTimeframe {
  return TIMEFRAME_SET.has(value as DashboardTimeframe);
}

export const DASHBOARD_TIMEFRAME_STORAGE_KEY = "mags-dashboard-timeframe";

export type DashboardChartId =
  | "inventory"
  | "monthly"
  | "consumption"
  | "colors";

export function getDashboardChartTimeframeKey(chartId: DashboardChartId): string {
  return `mags-dashboard-timeframe-${chartId}`;
}

export function readDashboardChartTimeframe(chartId: DashboardChartId): DashboardTimeframe {
  if (typeof window === "undefined") return DEFAULT_DASHBOARD_TIMEFRAME;
  const stored = window.localStorage.getItem(getDashboardChartTimeframeKey(chartId));
  return stored && isDashboardTimeframe(stored) ? stored : DEFAULT_DASHBOARD_TIMEFRAME;
}

export function writeDashboardChartTimeframe(
  chartId: DashboardChartId,
  timeframe: DashboardTimeframe
): void {
  window.localStorage.setItem(getDashboardChartTimeframeKey(chartId), timeframe);
}

export const DEFAULT_DASHBOARD_TIMEFRAME: DashboardTimeframe = "financial-year";

/** Indian financial year: April 1 – March 31 */
const FY_START_MONTH = 3;

export interface DateRange {
  start: Date;
  end: Date;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getFinancialYearStart(reference: Date): Date {
  const year =
    reference.getMonth() >= FY_START_MONTH
      ? reference.getFullYear()
      : reference.getFullYear() - 1;
  return startOfDay(new Date(year, FY_START_MONTH, 1));
}

export function getDateRangeForTimeframe(
  timeframe: DashboardTimeframe,
  reference = new Date()
): DateRange {
  const end = endOfDay(reference);

  switch (timeframe) {
    case "today":
      return { start: startOfDay(reference), end };
    case "7d": {
      const start = startOfDay(reference);
      start.setDate(start.getDate() - 6);
      return { start, end };
    }
    case "30d": {
      const start = startOfDay(reference);
      start.setDate(start.getDate() - 29);
      return { start, end };
    }
    case "this-month":
      return {
        start: startOfDay(new Date(reference.getFullYear(), reference.getMonth(), 1)),
        end,
      };
    case "3m": {
      const start = startOfDay(new Date(reference.getFullYear(), reference.getMonth(), 1));
      start.setMonth(start.getMonth() - 2);
      return { start, end };
    }
    case "this-quarter": {
      const quarterMonth = Math.floor(reference.getMonth() / 3) * 3;
      return {
        start: startOfDay(new Date(reference.getFullYear(), quarterMonth, 1)),
        end,
      };
    }
    case "financial-year":
      return { start: getFinancialYearStart(reference), end };
    default:
      return { start: getFinancialYearStart(reference), end };
  }
}

export function getTimeframeLabel(timeframe: DashboardTimeframe): string {
  return DASHBOARD_TIMEFRAMES.find((t) => t.value === timeframe)?.label ?? "Financial Year";
}
