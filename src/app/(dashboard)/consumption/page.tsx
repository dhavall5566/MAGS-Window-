"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { consumptionSchema } from "@/lib/validations";
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
import { calculateWeight, formatDate, formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Gauge } from "lucide-react";
import { safeFetchArray, safeFetchJson } from "@/lib/safe-fetch";
import {
  fallbackProfilesResponse,
  fallbackConsumptions,
} from "@/lib/client-fallbacks";

type FormData = z.infer<typeof consumptionSchema>;

export default function ConsumptionPage() {
  const [profiles, setProfiles] = useState(
    fallbackProfilesResponse.profiles as {
      id: string;
      profileCode: string;
      profileName: string;
      imageUrl?: string | null;
      weightPerMeter: number;
      currentStock: number;
    }[]
  );
  const [entries, setEntries] = useState<Record<string, unknown>[]>(fallbackConsumptions);
  const [demoMode, setDemoMode] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(consumptionSchema),
    defaultValues: { unit: "METER", date: new Date().toISOString().split("T")[0] },
  });

  const profileId = watch("profileId");
  const quantity = watch("quantity");
  const unit = watch("unit");
  const selected = profiles.find((p) => p.id === profileId);
  const previewWeight = selected && quantity
    ? calculateWeight(Number(quantity), selected.weightPerMeter, unit)
    : 0;

  const load = async () => {
    let demo = false;
    const pRes = await safeFetchJson(
      "/api/profiles",
      fallbackProfilesResponse,
      (d) =>
        typeof d === "object" &&
        d !== null &&
        Array.isArray((d as { profiles?: unknown }).profiles)
    );
    setProfiles((pRes.data.profiles ?? []) as typeof profiles);
    if (pRes.demo) demo = true;
    const eRes = await safeFetchArray("/api/consumption", fallbackConsumptions);
    setEntries(eRes.data);
    if (eRes.demo) demo = true;
    setDemoMode(demo);
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/consumption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
      return;
    }
    toast.success(`Consumed ${previewWeight.toFixed(2)} KG recorded`);
    reset({ unit: "METER", date: new Date().toISOString().split("T")[0] });
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Consumption"
        description="Record production material usage with auto KG calculation"
        demoMode={demoMode}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-4 w-4" /> New Consumption
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Profile</Label>
                <ProfileSelect profiles={profiles} value={profileId ?? ""} onChange={(id) => setValue("profileId", id)} showStock />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Length</Label>
                  <Input type="number" step="0.01" {...register("quantity")} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={unit} onValueChange={(v) => setValue("unit", v as "METER" | "FEET")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="METER">Meter</SelectItem>
                      <SelectItem value="FEET">Feet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {selected && quantity > 0 && (
                <div className="rounded-lg bg-primary/10 p-3 text-sm">
                  <p className="font-medium text-primary">Calculated Weight</p>
                  <p className="text-2xl font-bold">
                    {formatNumber(previewWeight)} KG
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {quantity} {unit} × {selected.weightPerMeter} KG/MTR
                  </p>
                </div>
              )}
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
                Record Consumption
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Consumption History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Length</TableHead>
                  <TableHead>Weight (KG)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entries as { id: string; date: string; quantity: number; unit: string; calculatedWeight: number; profile: { profileCode: string } }[]).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell className="font-medium">{e.profile.profileCode}</TableCell>
                    <TableCell>{e.quantity} {e.unit}</TableCell>
                    <TableCell>{formatNumber(e.calculatedWeight)}</TableCell>
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
