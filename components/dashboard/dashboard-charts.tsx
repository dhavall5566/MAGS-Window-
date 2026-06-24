"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardTimeframeSelect } from "@/components/dashboard/dashboard-timeframe-select";
import { useDashboardChartTimeframe } from "@/hooks/use-dashboard-chart-timeframe";
import { BRAND, CHART_COLORS } from "@/lib/brand";
import type { DashboardTimeframe } from "@/lib/dashboard-timeframe";

function ChartCardHeader({
  title,
  timeframe,
  onTimeframeChange,
}: {
  title: string;
  timeframe: DashboardTimeframe;
  onTimeframeChange: (value: DashboardTimeframe) => void;
}) {
  return (
    <CardHeader className="flex flex-col gap-3 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle className="text-base">{title}</CardTitle>
      <DashboardTimeframeSelect
        value={timeframe}
        onChange={onTimeframeChange}
        compact
        className="w-full sm:w-auto"
      />
    </CardHeader>
  );
}

function ChartCardSkeleton() {
  return <div className="h-[360px] rounded-xl border bg-card animate-pulse" />;
}

function InventoryOverviewCard() {
  const { timeframe, updateTimeframe, data, ready, loading } = useDashboardChartTimeframe<{
    category: string;
    stock: number;
  }>("inventory");

  if (!ready || loading) return <ChartCardSkeleton />;

  return (
    <Card>
      <ChartCardHeader
        title="Inventory Overview"
        timeframe={timeframe}
        onTimeframeChange={updateTimeframe}
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="stock" fill={BRAND.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function MonthlyStockMovementCard() {
  const { timeframe, updateTimeframe, data, ready, loading } = useDashboardChartTimeframe<{
    month: string;
    inward: number;
    outward: number;
  }>("monthly");

  if (!ready || loading) return <ChartCardSkeleton />;

  return (
    <Card>
      <ChartCardHeader
        title="Monthly Stock Movement"
        timeframe={timeframe}
        onTimeframeChange={updateTimeframe}
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="inward" fill="#059669" name="Inward" radius={[4, 4, 0, 0]} />
            <Bar dataKey="outward" fill="#dc2626" name="Outward" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ConsumptionTrendsCard() {
  const { timeframe, updateTimeframe, data, ready, loading } = useDashboardChartTimeframe<{
    week: string;
    consumption: number;
  }>("consumption");

  if (!ready || loading) return <ChartCardSkeleton />;

  return (
    <Card>
      <ChartCardHeader
        title="Consumption Trends"
        timeframe={timeframe}
        onTimeframeChange={updateTimeframe}
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="consumption"
              stroke={BRAND.primary}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function ColorDistributionCard() {
  const { timeframe, updateTimeframe, data, ready, loading } = useDashboardChartTimeframe<{
    color: string;
    count: number;
    fill?: string;
  }>("colors");

  if (!ready || loading) return <ChartCardSkeleton />;

  return (
    <Card>
      <ChartCardHeader
        title="Powder Coating Color Distribution"
        timeframe={timeframe}
        onTimeframeChange={updateTimeframe}
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="color"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(props) => {
                const name = props.name ?? props.color ?? "";
                const pct = ((props.percent ?? 0) * 100).toFixed(0);
                return `${name} ${pct}%`;
              }}
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.color ?? i}
                  fill={entry.fill ?? CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DashboardCharts() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <InventoryOverviewCard />
      <MonthlyStockMovementCard />
      <ConsumptionTrendsCard />
      <ColorDistributionCard />
    </div>
  );
}
