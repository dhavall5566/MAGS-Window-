"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { TRANSACTION_TYPES } from "@/lib/constants";
import { exportToCSV, exportToExcel } from "@/lib/export";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { Download, FileSpreadsheet } from "lucide-react";
import { safeFetchArray, safeFetchJson } from "@/lib/safe-fetch";
import {
  fallbackProfilesResponse,
  fallbackStockLedgers,
} from "@/lib/client-fallbacks";

export default function LedgerPage() {
  const [entries, setEntries] = useState<Record<string, unknown>[]>(fallbackStockLedgers);
  const [profiles, setProfiles] = useState<{ id: string; profileCode: string }[]>(
    fallbackProfilesResponse.profiles.map((p) => ({
      id: p.id,
      profileCode: p.profileCode,
    }))
  );
  const [demoMode, setDemoMode] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    const params = new URLSearchParams();
    if (profileId) params.set("profileId", profileId);
    if (type) params.set("type", type);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await safeFetchArray(
      `/api/ledger?${params}`,
      fallbackStockLedgers
    );
    setEntries(res.data);
    if (res.demo) setDemoMode(true);
  };

  useEffect(() => {
    (async () => {
      const res = await safeFetchJson(
        "/api/profiles",
        fallbackProfilesResponse,
        (d) =>
          typeof d === "object" &&
          d !== null &&
          Array.isArray((d as { profiles?: unknown }).profiles)
      );
      setProfiles(
        (res.data.profiles ?? []).map((p) => ({
          id: p.id,
          profileCode: p.profileCode,
        }))
      );
      if (res.demo) setDemoMode(true);
    })();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial fetch only; filters use Apply
  }, []);

  type Entry = {
    id: string;
    date: string;
    transactionType: string;
    quantity: number;
    balance: number;
    remarks?: string;
    profile: { profileCode: string; profileName: string };
    user: { name: string };
  };

  const exportData = (entries as Entry[]).map((e) => ({
    Date: formatDateTime(e.date),
    Profile: e.profile.profileCode,
    Type: e.transactionType,
    Quantity: e.quantity,
    Balance: e.balance,
    User: e.user.name,
    Remarks: e.remarks ?? "",
  }));

  return (
    <div>
      <PageHeader
        title="Stock Ledger"
        description="Complete audit trail of all inventory transactions"
        demoMode={demoMode}
      >
        <Button variant="outline" onClick={() => exportToCSV(exportData, "stock-ledger")}>
          <Download className="mr-2 h-4 w-4" />CSV
        </Button>
        <Button variant="outline" onClick={() => exportToExcel(exportData, "stock-ledger")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />Excel
        </Button>
      </PageHeader>

      <Card className="mb-6">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label>Profile</Label>
            <Select value={profileId || "all"} onValueChange={(v) => setProfileId(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Profiles</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.profileCode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TRANSACTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={load} className="w-full">Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(entries as Entry[]).map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs">{formatDateTime(e.date)}</TableCell>
                <TableCell className="font-medium">{e.profile.profileCode}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {e.transactionType.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className={e.quantity < 0 ? "text-red-600" : "text-emerald-600"}>
                  {e.quantity > 0 ? "+" : ""}{formatNumber(e.quantity)}
                </TableCell>
                <TableCell>{formatNumber(e.balance)}</TableCell>
                <TableCell>{e.user.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
