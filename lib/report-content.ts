import { formatCurrency } from "@/lib/profile";
import { getReportTypeLabel } from "@/lib/report-form";
import { formatDate, formatNumber } from "@/lib/utils";
import type { Report } from "@/types";

export interface ReportApiData {
  monthlyStockMovement?: {
    month: string;
    inward: number;
    outward: number;
    coating: number;
  }[];
  consumptionTrends?: { week: string; consumption: number }[];
  colorDistribution?: { color: string; count: number; fill?: string }[];
  inventoryByCategory?: { category: string; stock: number; value: number }[];
  summary?: Record<string, number>;
}

export interface ReportMetric {
  label: string;
  value: string;
}

export interface ReportTableSection {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ReportPreviewContent {
  title: string;
  subtitle: string;
  metrics: ReportMetric[];
  tables: ReportTableSection[];
}

export function buildReportPreviewContent(
  report: Report,
  data: ReportApiData
): ReportPreviewContent {
  const summary = data.summary ?? {};
  const typeLabel = getReportTypeLabel(report.type);
  const subtitle = `${typeLabel} · ${formatDate(report.dateFrom)} – ${formatDate(report.dateTo)}`;

  switch (report.type) {
    case "stock_movement":
      return {
        title: report.name,
        subtitle,
        metrics: [
          {
            label: "Total Inward",
            value: `${formatNumber(
              (data.monthlyStockMovement ?? []).reduce((sum, row) => sum + row.inward, 0)
            )} kg`,
          },
          {
            label: "Total Outward",
            value: `${formatNumber(
              (data.monthlyStockMovement ?? []).reduce((sum, row) => sum + row.outward, 0)
            )} kg`,
          },
          {
            label: "Total Coating",
            value: `${formatNumber(
              (data.monthlyStockMovement ?? []).reduce((sum, row) => sum + row.coating, 0)
            )} kg`,
          },
        ],
        tables: [
          {
            title: "Monthly Stock Movement",
            headers: ["Month", "Inward (kg)", "Outward (kg)", "Coating (kg)"],
            rows: (data.monthlyStockMovement ?? []).map((row) => [
              row.month,
              formatNumber(row.inward),
              formatNumber(row.outward),
              formatNumber(row.coating),
            ]),
          },
        ],
      };

    case "consumption":
      return {
        title: report.name,
        subtitle,
        metrics: [
          {
            label: "Total Consumption",
            value: `${formatNumber(summary.totalConsumptionKg ?? 0)} kg`,
          },
          {
            label: "Avg Weekly",
            value: `${formatNumber(
              Math.round(
                (data.consumptionTrends ?? []).reduce((sum, row) => sum + row.consumption, 0) /
                  Math.max((data.consumptionTrends ?? []).length, 1)
              )
            )} kg`,
          },
          {
            label: "Peak Week",
            value: `${formatNumber(
              Math.max(...(data.consumptionTrends ?? []).map((row) => row.consumption), 0)
            )} kg`,
          },
        ],
        tables: [
          {
            title: "Weekly Consumption Trends",
            headers: ["Week", "Consumption (kg)"],
            rows: (data.consumptionTrends ?? []).map((row) => [
              row.week,
              formatNumber(row.consumption),
            ]),
          },
        ],
      };

    case "coating":
      return {
        title: report.name,
        subtitle,
        metrics: [
          {
            label: "Coating Efficiency",
            value: `${summary.coatingEfficiency ?? 0}%`,
          },
          {
            label: "Sent for Coating",
            value: `${formatNumber(summary.totalCoatingSentKg ?? 0)} kg`,
          },
          {
            label: "Returned from Coating",
            value: `${formatNumber(summary.totalCoatingReturnedKg ?? 0)} kg`,
          },
        ],
        tables: [
          {
            title: "Color Distribution",
            headers: ["Color", "Profiles"],
            rows: (data.colorDistribution ?? []).map((row) => [
              row.color,
              formatNumber(row.count),
            ]),
          },
        ],
      };

    case "inventory":
      return {
        title: report.name,
        subtitle,
        metrics: [
          {
            label: "Total Stock",
            value: formatNumber(
              (data.inventoryByCategory ?? []).reduce((sum, row) => sum + row.stock, 0)
            ),
          },
          {
            label: "Total Value",
            value: formatCurrency(
              (data.inventoryByCategory ?? []).reduce((sum, row) => sum + row.value, 0)
            ),
          },
          {
            label: "Categories",
            value: formatNumber((data.inventoryByCategory ?? []).length),
          },
        ],
        tables: [
          {
            title: "Inventory by Category",
            headers: ["Category", "Stock (kg)", "Value"],
            rows: (data.inventoryByCategory ?? []).map((row) => [
              row.category,
              formatNumber(row.stock),
              formatCurrency(row.value),
            ]),
          },
        ],
      };

    case "summary":
    default:
      return {
        title: report.name,
        subtitle,
        metrics: [
          {
            label: "Total Inward",
            value: `${formatNumber(summary.totalInwardKg ?? 0)} kg`,
          },
          {
            label: "Total Consumption",
            value: `${formatNumber(summary.totalConsumptionKg ?? 0)} kg`,
          },
          {
            label: "Scrap Generated",
            value: `${formatNumber(summary.totalScrapKg ?? 0)} kg`,
          },
          {
            label: "Coating Efficiency",
            value: `${summary.coatingEfficiency ?? 0}%`,
          },
          {
            label: "Stock Turnover",
            value: `${summary.stockTurnoverRatio ?? 0}x`,
          },
          {
            label: "Scrap %",
            value: `${summary.scrapPercentage ?? 0}%`,
          },
        ],
        tables: [
          {
            title: "Monthly Stock Movement",
            headers: ["Month", "Inward (kg)", "Outward (kg)", "Coating (kg)"],
            rows: (data.monthlyStockMovement ?? []).map((row) => [
              row.month,
              formatNumber(row.inward),
              formatNumber(row.outward),
              formatNumber(row.coating),
            ]),
          },
          {
            title: "Inventory by Category",
            headers: ["Category", "Stock (kg)", "Value"],
            rows: (data.inventoryByCategory ?? []).map((row) => [
              row.category,
              formatNumber(row.stock),
              formatCurrency(row.value),
            ]),
          },
        ],
      };
  }
}
