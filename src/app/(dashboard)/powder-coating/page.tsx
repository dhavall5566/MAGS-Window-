"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { powderCoatingSchema } from "@/lib/validations";
import { z } from "zod";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileSelect } from "@/components/shared/profile-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { POWDER_COLORS, POWDER_STATUSES } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Paintbrush, CheckCircle } from "lucide-react";

type FormData = z.infer<typeof powderCoatingSchema>;

const statusVariant: Record<string, "default" | "warning" | "success" | "secondary"> = {
  PENDING: "secondary",
  SENT_FOR_COATING: "default",
  IN_PROCESS: "warning",
  COMPLETED: "success",
  RETURNED: "secondary",
};

function PowderCoatingPageContent() {
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState<{ id: string; profileCode: string; profileName: string; imageUrl?: string | null; currentStock: number }[]>([]);
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
  const [colorFilter, setColorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(
    () => searchParams.get("status") ?? ""
  );

  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(powderCoatingSchema),
    defaultValues: { status: "PENDING", color: "WHITE" },
  });

  const profileId = watch("profileId");

  const load = useCallback(() => {
    fetch("/api/profiles").then((r) => r.json()).then((d) => setProfiles(d.profiles ?? []));
    const params = new URLSearchParams();
    if (colorFilter) params.set("color", colorFilter);
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/powder-coating?${params}`).then((r) => r.json()).then(setEntries);
  }, [colorFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/powder-coating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
      return;
    }
    toast.success("Powder coating transfer recorded");
    reset({ status: "PENDING", color: "WHITE" });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch("/api/powder-coating", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      toast.error("Failed to update status");
      return;
    }
    toast.success("Status updated");
    load();
  };

  type Entry = {
    id: string;
    transferDate: string;
    quantity: number;
    weight: number;
    color: string;
    status: string;
    profile: { profileCode: string; currentStock: number; powderCoatedStock: number };
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Powder Coating" description="Track raw and powder coated aluminium stock separately" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Paintbrush className="h-4 w-4" /> Transfer for Coating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <ProfileSelect profiles={profiles} value={profileId ?? ""} onChange={(id) => setValue("profileId", id)} showStock />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" {...register("quantity")} />
                </div>
                <div className="space-y-2">
                  <Label>Weight (KG)</Label>
                  <Input type="number" step="0.01" {...register("weight")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select defaultValue="WHITE" onValueChange={(v) => setValue("color", v as FormData["color"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POWDER_COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Initial Status</Label>
                <Select defaultValue="SENT_FOR_COATING" onValueChange={(v) => setValue("status", v as FormData["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POWDER_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Remarks" {...register("remarks")} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Transfer
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Coating Jobs</CardTitle>
              <div className="flex gap-2">
                <Select value={colorFilter || "all"} onValueChange={(v) => setColorFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Color" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Colors</SelectItem>
                    {POWDER_COLORS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {POWDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entries as Entry[]).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.profile.profileCode}</TableCell>
                    <TableCell>{e.color.replace(/_/g, " ")}</TableCell>
                    <TableCell>{formatNumber(e.weight)} KG</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[e.status] ?? "default"}>
                        {e.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {e.status !== "COMPLETED" && (
                        <div className="flex gap-1">
                          {e.status === "PENDING" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(e.id, "SENT_FOR_COATING")}>Send</Button>
                          )}
                          {e.status === "SENT_FOR_COATING" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(e.id, "IN_PROCESS")}>Process</Button>
                          )}
                          {["IN_PROCESS", "SENT_FOR_COATING"].includes(e.status) && (
                            <Button size="sm" variant="default" onClick={() => updateStatus(e.id, "COMPLETED")}>
                              <CheckCircle className="h-3 w-3 mr-1" />Complete
                            </Button>
                          )}
                        </div>
                      )}
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

export default function PowderCoatingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
      <PowderCoatingPageContent />
    </Suspense>
  );
}
