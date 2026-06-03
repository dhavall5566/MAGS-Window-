"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockInwardSchema } from "@/lib/validations";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileSelect } from "@/components/shared/profile-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, ArrowDownToLine } from "lucide-react";

type FormData = z.infer<typeof stockInwardSchema>;

export default function StockInwardPage() {
  const [profiles, setProfiles] = useState<{ id: string; profileCode: string; profileName: string; imageUrl?: string | null }[]>([]);
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(stockInwardSchema),
    defaultValues: { date: new Date().toISOString().split("T")[0] },
  });

  const profileId = watch("profileId");

  const load = () => {
    fetch("/api/profiles").then((r) => r.json()).then((d) => setProfiles(d.profiles ?? []));
    fetch("/api/stock-inward").then((r) => r.json()).then(setEntries);
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/stock-inward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast.error("Failed to create entry");
      return;
    }
    toast.success("Stock inward recorded");
    reset();
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Inward" description="Record incoming aluminium profile stock" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4" /> New Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Profile</Label>
                <ProfileSelect profiles={profiles} value={profileId ?? ""} onChange={(id) => setValue("profileId", id)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quantity (pcs)</Label>
                  <Input type="number" {...register("quantity")} />
                </div>
                <div className="space-y-2">
                  <Label>Length (MTR)</Label>
                  <Input type="number" step="0.1" {...register("length")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Weight (KG) *</Label>
                <Input type="number" step="0.01" {...register("weight")} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" {...register("date")} />
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea {...register("remarks")} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Inward
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Inward History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entries as { id: string; date: string; quantity: number; weight: number; remarks?: string; profile: { profileCode: string } }[]).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell className="font-medium">{e.profile.profileCode}</TableCell>
                    <TableCell>{e.quantity}</TableCell>
                    <TableCell>{formatNumber(e.weight)} KG</TableCell>
                    <TableCell className="text-muted-foreground">{e.remarks ?? "—"}</TableCell>
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
