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
import { useDashboardChartTimeframe } from "@/hooks/use-dashboard-live-data";
import { BRAND, CHART_COLORS } from "@/lib/brand";
import type { DashboardTimeframe } from "@/lib/dashboard-timeframe";
import type { Challan, PowderCoating, Profile, StockInward } from "@/types";

interface DashboardChartsProps {
  apiProfiles?: Profile[];
  apiInward?: StockInward[];
  apiChallans?: Challan[];
  apiPowderCoating?: PowderCoating[];
}

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

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function InventoryOverviewCard({
  apiProfiles,
  apiInward,
  apiChallans,
  apiPowderCoating,
}: DashboardChartsProps) {
  const { timeframe, updateTimeframe, data, ready, loading } = useDashboardChartTimeframe<{
    category: string;
    stock: number;
  }>("inventory", apiProfiles, apiInward, apiChallans, apiPowderCoating);

  if (!ready || loading) return <ChartCardSkeleton />;

  return (
    <Card>
      <ChartCardHeader
        title="Inventory Overview"
        timeframe={timeframe}
        onTimeframeChange={updateTimeframe}
      />
      <CardContent>
        {data.length === 0 ? (
          <EmptyChartState message="No inventory data yet. Add stock inward to see category breakdown." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 10 }}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="stock" fill={BRAND.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function MonthlyStockMovementCard({
  apiProfiles,
  apiInward,
  apiChallans,
  apiPowderCoating,
}: DashboardChartsProps) {
  const { timeframe, updateTimeframe, data, ready, loading } = useDashboardChartTimeframe<{
    month: string;
    inward: number;
    outward: number;
  }>("monthly", apiProfiles, apiInward, apiChallans, apiPowderCoating);

  if (!ready || loading) return <ChartCardSkeleton />;

  return (
    <Card>
      <ChartCardHeader
        title="Monthly Stock Movement"
        timeframe={timeframe}
        onTimeframeChange={updateTimeframe}
      />
      <CardContent>
        {data.length === 0 ? (
          <EmptyChartState message="No stock movement in this period." />
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}

function ConsumptionTrendsCard({
  apiProfiles,
  apiInward,
  apiChallans,
  apiPowderCoating,
}: DashboardChartsProps) {
  const { timeframe, updateTimeframe, data, ready, loading } = useDashboardChartTimeframe<{
    week: string;
    consumption: number;
  }>("consumption", apiProfiles, apiInward, apiChallans, apiPowderCoating);

  if (!ready || loading) return <ChartCardSkeleton />;

  return (
    <Card>
      <ChartCardHeader
        title="Consumption Trends"
        timeframe={timeframe}
        onTimeframeChange={updateTimeframe}
      />
      <CardContent>
        {data.length === 0 ? (
          <EmptyChartState message="No consumption recorded in this period." />
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}

function ColorDistributionCard({
  apiProfiles,
  apiInward,
  apiChallans,
  apiPowderCoating,
}: DashboardChartsProps) {
  const { timeframe, updateTimeframe, data, ready, loading } = useDashboardChartTimeframe<{
    color: string;
    count: number;
    fill?: string;
  }>("colors", apiProfiles, apiInward, apiChallans, apiPowderCoating);

  if (!ready || loading) return <ChartCardSkeleton />;

  return (
    <Card>
      <ChartCardHeader
        title="Powder Coating Color Distribution"
        timeframe={timeframe}
        onTimeframeChange={updateTimeframe}
      />
      <CardContent>
        {data.length === 0 ? (
          <EmptyChartState message="No powder coating data in this period." />
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardCharts({
  apiProfiles = [],
  apiInward = [],
  apiChallans = [],
  apiPowderCoating = [],
}: DashboardChartsProps) {
  const chartProps = { apiProfiles, apiInward, apiChallans, apiPowderCoating };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <InventoryOverviewCard {...chartProps} />
      <MonthlyStockMovementCard {...chartProps} />
      <ConsumptionTrendsCard {...chartProps} />
      <ColorDistributionCard {...chartProps} />
    </div>
  );
}
