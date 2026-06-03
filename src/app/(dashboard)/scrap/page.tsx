"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { scrapSchema } from "@/lib/validations";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileSelect } from "@/components/shared/profile-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { SCRAP_REASONS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { safeFetchArray, safeFetchJson } from "@/lib/safe-fetch";
import {
  fallbackProfilesResponse,
  fallbackScrapWastes,
} from "@/lib/client-fallbacks";

type FormData = z.infer<typeof scrapSchema>;

export default function ScrapPage() {
  const [profiles, setProfiles] = useState(
    fallbackProfilesResponse.profiles as {
      id: string;
      profileCode: string;
      profileName: string;
      imageUrl?: string | null;
      currentStock: number;
    }[]
  );
  const [entries, setEntries] = useState<Record<string, unknown>[]>(fallbackScrapWastes);
  const [demoMode, setDemoMode] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(scrapSchema),
    defaultValues: { reason: "CUTTING_WASTE", date: new Date().toISOString().split("T")[0] },
  });

  const profileId = watch("profileId");

  const load = async () => {
    let demo = false;
    const pRes = await safeFetchJson("/api/profiles", fallbackProfilesResponse, (d) =>
      typeof d === "object" && d !== null && Array.isArray((d as { profiles?: unknown }).profiles)
    );
    setProfiles((pRes.data.profiles ?? []) as typeof profiles);
    if (pRes.demo) demo = true;
    const eRes = await safeFetchArray("/api/scrap", fallbackScrapWastes);
    setEntries(eRes.data);
    if (eRes.demo) demo = true;
    setDemoMode(demo);
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/scrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
      return;
    }
    toast.success("Scrap entry recorded");
    reset({ reason: "CUTTING_WASTE", date: new Date().toISOString().split("T")[0] });
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scrap & Waste"
        description="Track cutting waste, damaged material, and production loss"
        demoMode={demoMode}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> New Scrap Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <ProfileSelect profiles={profiles} value={profileId ?? ""} onChange={(id) => setValue("profileId", id)} showStock />
              <div className="space-y-2">
                <Label>Quantity (KG)</Label>
                <Input type="number" step="0.01" {...register("quantity")} />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select defaultValue="CUTTING_WASTE" onValueChange={(v) => setValue("reason", v as FormData["reason"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCRAP_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" {...register("date")} />
              </div>
              <Textarea placeholder="Remarks" {...register("remarks")} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Scrap
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Scrap History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Qty (KG)</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entries as { id: string; date: string; quantity: number; reason: string; profile: { profileCode: string } }[]).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell className="font-medium">{e.profile.profileCode}</TableCell>
                    <TableCell>{formatNumber(e.quantity)}</TableCell>
                    <TableCell>{e.reason.replace(/_/g, " ")}</TableCell>
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
