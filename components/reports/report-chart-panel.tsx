"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { buildReportPreviewContent, type ReportApiData } from "@/lib/report-content";
import { getReportTypeLabel } from "@/lib/report-form";
import { formatDate } from "@/lib/utils";
import type { Report } from "@/types";

interface ReportChartPanelProps {
  report: Report;
  reportData: ReportApiData;
  onClose: () => void;
}

const stockMovementConfig = {
  inward: { label: "Inward", color: "hsl(var(--chart-2))" },
  outward: { label: "Outward", color: "hsl(var(--chart-3))" },
  coating: { label: "Coating", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const consumptionConfig = {
  consumption: { label: "Consumption (kg)", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const inventoryConfig = {
  stock: { label: "Stock (kg)", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const summaryMetricsConfig = {
  value: { label: "Value", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

function sanitizeChartKey(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "_");
}

function buildColorChartConfig(
  data: { color: string; count: number; fill?: string }[]
): ChartConfig {
  return data.reduce<ChartConfig>((config, entry, index) => {
    const key = sanitizeChartKey(entry.color);
    config[key] = {
      label: entry.color,
      color: entry.fill || `hsl(var(--chart-${(index % 6) + 1}))`,
    };
    return config;
  }, {});
}

function withColorKeys(data: { color: string; count: number; fill?: string }[]) {
  return data.map((entry, index) => ({
    ...entry,
    chartKey: sanitizeChartKey(entry.color),
    chartFill: entry.fill || `hsl(var(--chart-${(index % 6) + 1}))`,
  }));
}

function buildSummaryChartData(summary: Record<string, number>) {
  return [
    { metric: "Inward", value: summary.totalInwardKg ?? 0 },
    { metric: "Consumption", value: summary.totalConsumptionKg ?? 0 },
    { metric: "Coating Sent", value: summary.totalCoatingSentKg ?? 0 },
    { metric: "Coating Returned", value: summary.totalCoatingReturnedKg ?? 0 },
  ];
}

export function ReportChartPanel({ report, reportData, onClose }: ReportChartPanelProps) {
  const content = buildReportPreviewContent(report, reportData);
  const typeLabel = getReportTypeLabel(report.type);

  const renderChart = () => {
    switch (report.type) {
      case "stock_movement": {
        const data = reportData.monthlyStockMovement ?? [];
        return (
          <ChartContainer config={stockMovementConfig} className="h-[320px] w-full">
            <BarChart data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="inward" fill="var(--color-inward)" radius={4} />
              <Bar dataKey="outward" fill="var(--color-outward)" radius={4} />
              <Bar dataKey="coating" fill="var(--color-coating)" radius={4} />
            </BarChart>
          </ChartContainer>
        );
      }

      case "consumption": {
        const data = reportData.consumptionTrends ?? [];
        return (
          <ChartContainer config={consumptionConfig} className="h-[320px] w-full">
            <LineChart data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="consumption"
                stroke="var(--color-consumption)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        );
      }

      case "coating": {
        const raw = reportData.colorDistribution ?? [];
        const data = withColorKeys(raw);
        const colorConfig = buildColorChartConfig(raw);
        return (
          <ChartContainer config={colorConfig} className="mx-auto h-[320px] w-full max-w-xl">
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent hideLabel nameKey="chartKey" />}
              />
              <Pie
                data={data}
                dataKey="count"
                nameKey="chartKey"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.color} fill={entry.chartFill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="chartKey" />} />
            </PieChart>
          </ChartContainer>
        );
      }

      case "inventory": {
        const data = (reportData.inventoryByCategory ?? []).map((row) => ({
          category: row.category,
          stock: row.stock,
        }));
        return (
          <ChartContainer config={inventoryConfig} className="h-[360px] w-full">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                type="category"
                dataKey="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={120}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="stock" fill="var(--color-stock)" radius={4} />
            </BarChart>
          </ChartContainer>
        );
      }

      case "summary":
      default: {
        const data = buildSummaryChartData(reportData.summary ?? {});
        return (
          <ChartContainer config={summaryMetricsConfig} className="h-[320px] w-full">
            <BarChart data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="metric"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={4} />
            </BarChart>
          </ChartContainer>
        );
      }
    }
  };

  const chartDescription: Record<Report["type"], string> = {
    stock_movement: "Monthly inward, outward, and coating movement",
    consumption: "Weekly consumption trend",
    coating: "Powder coating color distribution",
    inventory: "Stock levels by category",
    summary: "Key operational metrics overview",
  };

  return (
    <Card className="mt-6 border shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{report.name}</CardTitle>
          <CardDescription>
            {typeLabel} · {formatDate(report.dateFrom)} – {formatDate(report.dateTo)} ·{" "}
            {chartDescription[report.type]}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label="Close chart"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {renderChart()}
        {content.metrics.length > 0 && (
          <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {content.metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="text-sm font-semibold">{metric.value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
