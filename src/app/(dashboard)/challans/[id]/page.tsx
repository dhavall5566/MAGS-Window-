"use client";

import { useEffect, useState } from "react";
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

export default function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [challan, setChallan] = useState<Record<string, unknown> | null>(null);

  const load = () => fetch(`/api/challans/${id}`).then((r) => r.json()).then(setChallan);

  useEffect(() => { load(); }, [id]);

  if (!challan) return <p className="p-6">Loading...</p>;

  const c = challan as {
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
    verifiedToken: string;
    vendor?: { name: string; phone?: string; address?: string };
    project?: { projectCode: string; projectName: string };
    parentChallan?: { challanNumber: string };
    items: { quantity: number; length?: number; weight: number; profile: { profileCode: string; profileName: string; imageUrl?: string } }[];
  };

  const updateStatus = async (status: string) => {
    const res = await fetch(`/api/challans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { toast.error("Failed"); return; }
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
      const err = await res.json();
      toast.error(err.error ?? "Failed");
      return;
    }
    toast.success("Done");
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title={c.challanNumber} description={CHALLAN_TYPE_LABELS[c.type as keyof typeof CHALLAN_TYPE_LABELS]}>
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
                {c.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded bg-muted overflow-hidden shrink-0">
                          {item.profile.imageUrl ? (
                            <Image src={item.profile.imageUrl} alt="" fill className="object-cover" />
                          ) : (
                            <Package className="m-2 h-6 w-6 text-muted-foreground/40" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{item.profile.profileCode}</p>
                          <p className="text-xs text-muted-foreground">{item.profile.profileName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.length ?? "—"}</TableCell>
                    <TableCell>{formatNumber(item.weight)} KG</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell>{formatNumber(c.totalWeight)} KG</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
