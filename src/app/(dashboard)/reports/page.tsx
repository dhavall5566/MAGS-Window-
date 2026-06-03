"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { POWDER_COLORS, POWDER_STATUSES } from "@/lib/constants";

const REPORT_TYPES = [
  { value: "current-stock", label: "Current Stock Report" },
  { value: "consumption", label: "Consumption Report" },
  { value: "powder-coating", label: "Powder Coating Report" },
  { value: "color-inventory", label: "Color Wise Inventory" },
  { value: "scrap", label: "Scrap Report" },
  { value: "stock-movement", label: "Stock Movement Report" },
  { value: "low-stock", label: "Low Stock Report" },
];

function ReportsPageContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");
  const [reportType, setReportType] = useState(
    () =>
      REPORT_TYPES.some((r) => r.value === initialType)
        ? (initialType as string)
        : "current-stock"
  );
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; profileCode: string }[]>([]);
  const [profileId, setProfileId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [color, setColor] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/profiles").then((r) => r.json()).then((d) => setProfiles(d.profiles ?? []));
  }, []);

  useEffect(() => {
    const type = searchParams.get("type");
    if (type && REPORT_TYPES.some((r) => r.value === type)) {
      setReportType(type);
    }
  }, [searchParams]);

  const generate = async () => {
    setLoading(true);
    const params = new URLSearchParams({ type: reportType });
    if (profileId) params.set("profileId", profileId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (color) params.set("color", color);
    if (status) params.set("status", status);
    const res = await fetch(`/api/reports?${params}`);
    const result = await res.json();
    setData(Array.isArray(result) ? result : []);
    setLoading(false);
  };

  const title = REPORT_TYPES.find((r) => r.value === reportType)?.label ?? "Report";
  const headers = data[0] ? Object.keys(data[0]) : [];

  return (
    <div>
      <PageHeader title="Reports" description="Generate and export inventory and production reports" />

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Report Parameters</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Profile</Label>
            <Select value={profileId || "all"} onValueChange={(v) => setProfileId(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.profileCode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>From Date</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>To Date</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {reportType === "powder-coating" && (
            <>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={color || "all"} onValueChange={(v) => setColor(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {POWDER_COLORS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {POWDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button onClick={generate} disabled={loading} className="flex-1">
              {loading ? "Generating..." : "Generate Report"}
            </Button>
            {data.length > 0 && (
              <>
                <Button variant="outline" onClick={() => exportToCSV(data as never, reportType)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => exportToExcel(data as never, reportType)}>
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => exportToPDF(data as never, reportType, title)}>
                  <FileText className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {data.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{title} ({data.length} rows)</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, i) => (
                  <TableRow key={i}>
                    {headers.map((h) => (
                      <TableCell key={h}>{String(row[h] ?? "")}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading reports...</div>}>
      <ReportsPageContent />
    </Suspense>
  );
}
