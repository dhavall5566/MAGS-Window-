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

const CHART_COLORS = ["#4F5B85", "#0d9488", "#d97706", "#dc2626", "#7c3aed", "#db2777"];

interface DashboardData {
  stats: {
    totalProfiles: number;
    availableStock: number;
    lowStockCount: number;
    totalConsumption: number;
    pendingCoating: number;
    completedCoating: number;
    scrapQuantity: number;
  };
  lowStockProfiles: { profileCode: string; profileName: string; currentStock: number; lowStockThreshold: number }[];
  recentTransactions: {
    id: string;
    transactionType: string;
    quantity: number;
    balance: number;
    date: string;
    profile: { profileCode: string; profileName: string };
    user: { name: string };
  }[];
  charts: {
    inventoryOverview: { name: string; stock: number }[];
    consumptionTrend: { month: string; weight: number }[];
    colorWiseCoating: { color: string; weight: number }[];
    stockMovement: { month: string; inward: number; outward: number }[];
  };
}

interface ChallanMetrics {
  materialSentForCoating: number;
  materialReturned: number;
  pendingCoating: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [challanMetrics, setChallanMetrics] = useState<ChallanMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then(async (r) => {
        const json = await r.json();
        if (!r.ok || json.error || !json.stats) {
          throw new Error(json.error ?? "Failed to load dashboard");
        }
        return json as DashboardData;
      }),
      fetch("/api/challans/metrics").then(async (r) => {
        const json = await r.json();
        if (!r.ok || json.error) return null;
        return json as ChallanMetrics;
      }),
    ])
      .then(([dash, challan]) => {
        setData(dash);
        setChallanMetrics(challan);
        setLoadError(null);
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load dashboard");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

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

  if (loadError || !data?.stats) {
    return (
      <div className="space-y-4">
        <PageHeader title="Dashboard" description="Inventory and operations overview" />
        <p className="text-sm text-destructive">
          {loadError ?? "Dashboard data is unavailable. Please refresh the page."}
        </p>
      </div>
    );
  }

  const { stats, charts, recentTransactions, lowStockProfiles } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of aluminium profile inventory and operations"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Profiles"
          value={stats.totalProfiles}
          icon={Package}
          href="/profiles"
        />
        <StatCard
          title="Available Stock"
          value={`${formatNumber(stats.availableStock)} KG`}
          icon={Warehouse}
          variant="success"
          href="/reports?type=current-stock"
        />
        <StatCard
          title="Low Stock Profiles"
          value={stats.lowStockCount}
          icon={AlertTriangle}
          variant="warning"
          href="/reports?type=low-stock"
        />
        <StatCard
          title="Total Consumption"
          value={`${formatNumber(stats.totalConsumption)} KG`}
          icon={Gauge}
          href="/consumption"
        />
        <StatCard
          title="Pending Coating"
          value={stats.pendingCoating}
          icon={Paintbrush}
          variant="warning"
          href="/powder-coating"
        />
        <StatCard
          title="Completed Coating"
          value={stats.completedCoating}
          icon={CheckCircle}
          variant="success"
          href="/powder-coating?status=COMPLETED"
        />
        <StatCard
          title="Scrap Quantity"
          value={`${formatNumber(stats.scrapQuantity)} KG`}
          icon={Trash2}
          variant="danger"
          href="/scrap"
        />
      </div>

      {challanMetrics && (
        <>
          <h2 className="text-lg font-semibold">Challan Metrics</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Material Sent for Coating"
              value={`${formatNumber(challanMetrics.materialSentForCoating)} KG`}
              icon={Truck}
              href="/challans"
            />
            <StatCard
              title="Material Returned"
              value={`${formatNumber(challanMetrics.materialReturned)} KG`}
              icon={RotateCcw}
              variant="success"
              href="/challans"
            />
            <StatCard
              title="Pending Coating (Challans)"
              value={challanMetrics.pendingCoating}
              icon={Paintbrush}
              variant="warning"
              href="/challans"
            />
            <StatCard title="Challan Management" value="Open" icon={FileText} href="/challans" />
          </div>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.inventoryOverview}>
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
              <LineChart data={charts.consumptionTrend}>
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
                  data={charts.colorWiseCoating}
                  dataKey="weight"
                  nameKey="color"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {charts.colorWiseCoating.map((_, i) => (
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
              <BarChart data={charts.stockMovement}>
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
                    <TableCell className="font-medium">{t.profile.profileCode}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t.transactionType.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatNumber(t.quantity)}</TableCell>
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
