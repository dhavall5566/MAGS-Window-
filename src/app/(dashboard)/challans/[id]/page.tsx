"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHALLAN_STATUS_LABELS, CHALLAN_TYPE_LABELS, colorLabel } from "@/lib/challan-labels";
import { formatDate, formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Printer, Package } from "lucide-react";
import { safeFetchJson } from "@/lib/safe-fetch";
import { fallbackChallanById } from "@/lib/client-fallbacks";

type ChallanItem = {
  quantity: number;
  length?: number;
  weight: number;
  profile: { profileCode: string; profileName: string; imageUrl?: string };
};

type ChallanData = {
  id: string;
  challanNumber: string;
  type: string;
  status: string;
  issueDate: string;
  totalWeight: number;
  totalQty: number;
  color?: string;
  vehicleNo?: string;
  driverName?: string;
  remarks?: string;
  preparedBy?: string;
  verifiedToken?: string;
  vendor?: { name: string; phone?: string; address?: string };
  project?: { projectCode: string; projectName: string };
  parentChallan?: { challanNumber: string };
  items?: ChallanItem[];
};

function toChallanData(raw: Record<string, unknown>): ChallanData {
  const items = Array.isArray(raw.items) ? (raw.items as ChallanItem[]) : [];
  return {
    id: String(raw.id ?? ""),
    challanNumber: String(raw.challanNumber ?? "—"),
    type: String(raw.type ?? "OUTWARD"),
    status: String(raw.status ?? "DRAFT"),
    issueDate: String(raw.issueDate ?? new Date().toISOString()),
    totalWeight: Number(raw.totalWeight ?? 0),
    totalQty: Number(raw.totalQty ?? 0),
    color: raw.color as string | undefined,
    vehicleNo: raw.vehicleNo as string | undefined,
    driverName: raw.driverName as string | undefined,
    remarks: raw.remarks as string | undefined,
    preparedBy: raw.preparedBy as string | undefined,
    verifiedToken: raw.verifiedToken as string | undefined,
    vendor: raw.vendor as ChallanData["vendor"],
    project: raw.project as ChallanData["project"],
    parentChallan: raw.parentChallan as ChallanData["parentChallan"],
    items,
  };
}

export default function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [challan, setChallan] = useState<ChallanData>(() =>
    toChallanData(fallbackChallanById(id) as unknown as Record<string, unknown>)
  );
  const [demoMode, setDemoMode] = useState(false);

  const load = useCallback(async () => {
    const fallback = fallbackChallanById(id);
    const res = await safeFetchJson(
      `/api/challans/${id}`,
      fallback,
      (d) => typeof d === "object" && d !== null && !("error" in d)
    );
    setChallan(toChallanData(res.data as unknown as Record<string, unknown>));
    if (res.demo) setDemoMode(true);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const c = challan;
  const lineItems = c.items ?? [];

  const updateStatus = async (status: string) => {
    const res = await fetch(`/api/challans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Failed");
      return;
    }
    toast.success("Status updated");
    load();
  };

  const runAction = async (action: string) => {
    const res = await fetch(`/api/challans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Failed");
      return;
    }
    toast.success("Done");
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.challanNumber}
        description={CHALLAN_TYPE_LABELS[c.type as keyof typeof CHALLAN_TYPE_LABELS]}
        demoMode={demoMode}
      >
        <Button variant="outline" asChild>
          <Link href="/challans"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
        </Button>
        <Button variant="outline" asChild>
          <a href={`/api/challans/${id}/pdf`} target="_blank" rel="noreferrer">
            <Download className="mr-2 h-4 w-4" />PDF
          </a>
        </Button>
        <Button variant="outline" onClick={() => window.open(`/api/challans/${id}/pdf?print=1`, "_blank")}>
          <Printer className="mr-2 h-4 w-4" />Print
        </Button>
        {c.type === "OUTWARD" && c.status === "DRAFT" && (
          <Button onClick={() => runAction("issue")}>Issue & Deduct Stock</Button>
        )}
        {c.type === "RETURN" && c.status !== "COMPLETED" && (
          <Button onClick={() => runAction("complete_return")}>Complete Return</Button>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-3 pt-6 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge>{CHALLAN_STATUS_LABELS[c.status as keyof typeof CHALLAN_STATUS_LABELS]}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDate(c.issueDate)}</span>
            </div>
            {c.vendor && (
              <>
                <div className="border-t pt-2 font-medium">{c.vendor.name}</div>
                {c.vendor.phone && <p>{c.vendor.phone}</p>}
                {c.vendor.address && <p className="text-muted-foreground">{c.vendor.address}</p>}
              </>
            )}
            {c.color && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Color</span>
                <span>{colorLabel(c.color as never)}</span>
              </div>
            )}
            {c.parentChallan && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ref.</span>
                <span>{c.parentChallan.challanNumber}</span>
              </div>
            )}
            {c.type === "POWDER_COATING" && (
              <div className="space-y-2 pt-2">
                <Label>Update Status</Label>
                <Select value={c.status} onValueChange={updateStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["SENT_FOR_COATING", "IN_PROCESS", "RETURNED", "COMPLETED"].map((s) => (
                      <SelectItem key={s} value={s}>{CHALLAN_STATUS_LABELS[s as keyof typeof CHALLAN_STATUS_LABELS]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Length</TableHead>
                  <TableHead>Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No line items
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 rounded bg-muted overflow-hidden shrink-0">
                            {item.profile?.imageUrl ? (
                              <Image src={item.profile.imageUrl} alt="" fill className="object-cover" />
                            ) : (
                              <Package className="m-2 h-6 w-6 text-muted-foreground/40" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{item.profile?.profileCode ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">{item.profile?.profileName ?? ""}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.length ?? "—"}</TableCell>
                      <TableCell>{formatNumber(item.weight)} KG</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="font-bold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell>{formatNumber(c.totalWeight ?? 0)} KG</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
