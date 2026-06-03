"use client";

import { useEffect, useState } from "react";
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
import {
  Package,
  Warehouse,
  AlertTriangle,
  Gauge,
  Paintbrush,
  CheckCircle,
  Trash2,
  Truck,
  RotateCcw,
  FileText,
} from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatDateTime } from "@/lib/utils";
import { safeFetchJson } from "@/lib/safe-fetch";
import {
  fallbackDashboard,
  fallbackChallanMetrics,
} from "@/lib/client-fallbacks";

const CHART_COLORS = ["#4F5B85", "#0d9488", "#d97706", "#dc2626", "#7c3aed", "#db2777"];

type DashboardData = typeof fallbackDashboard;
type ChallanMetrics = typeof fallbackChallanMetrics;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(fallbackDashboard);
  const [challanMetrics, setChallanMetrics] = useState<ChallanMetrics>(fallbackChallanMetrics);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    (async () => {
      let demo = false;
      const dash = await safeFetchJson(
        "/api/dashboard",
        fallbackDashboard,
        (d) =>
          typeof d === "object" &&
          d !== null &&
          "stats" in d &&
          typeof (d as DashboardData).stats?.totalProfiles === "number"
      );
      if (dash.demo) demo = true;
      setData(dash.data);

      const met = await safeFetchJson(
        "/api/challans/metrics",
        fallbackChallanMetrics,
        (d) =>
          typeof d === "object" &&
          d !== null &&
          "materialSentForCoating" in d
      );
      if (met.demo) demo = true;
      setChallanMetrics(met.data);

      setDemoMode(demo);
      setLoading(false);
    })();
  }, []);

  const stats = data?.stats ?? fallbackDashboard.stats;
  const charts = data?.charts ?? fallbackDashboard.charts;
  const lowStockProfiles = data?.lowStockProfiles ?? [];
  const recentTransactions = data?.recentTransactions ?? [];
  const inventoryOverview = charts?.inventoryOverview ?? [];
  const consumptionTrend = charts?.consumptionTrend ?? [];
  const colorWiseCoating = charts?.colorWiseCoating ?? [];
  const stockMovement = charts?.stockMovement ?? [];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of aluminium profile inventory and operations"
        demoMode={demoMode}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Profiles"
          value={stats?.totalProfiles ?? 0}
          icon={Package}
          href="/profiles"
        />
        <StatCard
          title="Available Stock"
          value={`${formatNumber(stats?.availableStock ?? 0)} KG`}
          icon={Warehouse}
          variant="success"
          href="/reports?type=current-stock"
        />
        <StatCard
          title="Low Stock Profiles"
          value={stats?.lowStockCount ?? 0}
          icon={AlertTriangle}
          variant="warning"
          href="/reports?type=low-stock"
        />
        <StatCard
          title="Total Consumption"
          value={`${formatNumber(stats?.totalConsumption ?? 0)} KG`}
          icon={Gauge}
          href="/consumption"
        />
        <StatCard
          title="Pending Coating"
          value={stats?.pendingCoating ?? 0}
          icon={Paintbrush}
          variant="warning"
          href="/powder-coating"
        />
        <StatCard
          title="Completed Coating"
          value={stats?.completedCoating ?? 0}
          icon={CheckCircle}
          variant="success"
          href="/powder-coating?status=COMPLETED"
        />
        <StatCard
          title="Scrap Quantity"
          value={`${formatNumber(stats?.scrapQuantity ?? 0)} KG`}
          icon={Trash2}
          variant="danger"
          href="/scrap"
        />
      </div>

      <h2 className="text-lg font-semibold">Challan Metrics</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Material Sent for Coating"
          value={`${formatNumber(challanMetrics?.materialSentForCoating ?? 0)} KG`}
          icon={Truck}
          href="/challans"
        />
        <StatCard
          title="Material Returned"
          value={`${formatNumber(challanMetrics?.materialReturned ?? 0)} KG`}
          icon={RotateCcw}
          variant="success"
          href="/challans"
        />
        <StatCard
          title="Pending Coating (Challans)"
          value={challanMetrics?.pendingCoating ?? 0}
          icon={Paintbrush}
          variant="warning"
          href="/challans"
        />
        <StatCard title="Challan Management" value="Open" icon={FileText} href="/challans" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryOverview}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consumption Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={consumptionTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Color-wise Coating Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={colorWiseCoating}
                  dataKey="weight"
                  nameKey="color"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {colorWiseCoating.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Stock Movement</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockMovement}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="inward" fill="#4F5B85" name="Inward" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outward" fill="#dc2626" name="Outward" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">All profiles are adequately stocked.</p>
            ) : (
              <div className="space-y-3">
                {lowStockProfiles.map((p) => (
                  <div key={p.profileCode} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{p.profileCode}</p>
                      <p className="text-sm text-muted-foreground">{p.profileName}</p>
                    </div>
                    <Badge variant="warning">
                      {formatNumber(p.currentStock)} / {formatNumber(p.lowStockThreshold)} KG
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.profile?.profileCode ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {(t.transactionType ?? "").replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatNumber(t.quantity ?? 0)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDateTime(t.date)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
