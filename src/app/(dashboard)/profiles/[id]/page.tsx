"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Pencil, Package } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/profiles/profile-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { z } from "zod";
import { profileSchema } from "@/lib/validations";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch(`/api/profiles/${id}`)
      .then((r) => r.json())
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (data: z.infer<typeof profileSchema>) => {
    const res = await fetch(`/api/profiles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast.error("Failed to update profile");
      return;
    }
    toast.success("Profile updated");
    setEditing(false);
    load();
  };

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!profile) return <p>Profile not found</p>;

  const p = profile as {
    id: string;
    profileCode: string;
    profileName: string;
    seriesName: string;
    weightPerMeter: number;
    standardLength: number;
    description: string | null;
    imageUrl: string | null;
    technicalDrawingUrl: string | null;
    status: string;
    currentStock: number;
    powderCoatedStock: number;
    lowStockThreshold: number;
    stockLedgers: { transactionType: string; quantity: number; balance: number; date: string; user: { name: string } }[];
  };

  return (
    <div>
      <PageHeader title={p.profileCode} description={p.profileName}>
        <Button variant="outline" asChild>
          <Link href="/profiles"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
        </Button>
        <Button onClick={() => setEditing(!editing)}>
          <Pencil className="mr-2 h-4 w-4" />
          {editing ? "Cancel" : "Edit"}
        </Button>
      </PageHeader>

      {editing ? (
        <Card>
          <CardContent className="pt-6">
            <ProfileForm
              defaultValues={{
                profileCode: p.profileCode,
                profileName: p.profileName,
                seriesName: p.seriesName,
                weightPerMeter: p.weightPerMeter,
                standardLength: p.standardLength,
                description: p.description ?? undefined,
                imageUrl: p.imageUrl ?? undefined,
                technicalDrawingUrl: p.technicalDrawingUrl ?? undefined,
                status: p.status as "ACTIVE" | "INACTIVE",
                lowStockThreshold: p.lowStockThreshold,
              }}
              onSubmit={onSubmit}
              submitLabel="Update Profile"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <div className="relative h-56 bg-muted">
              {p.imageUrl ? (
                <Image src={p.imageUrl} alt={p.profileName} fill className="object-cover rounded-t-xl" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <CardContent className="space-y-3 pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Series</span>
                <span className="font-medium">{p.seriesName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weight</span>
                <span className="font-medium">{formatNumber(p.weightPerMeter)} KG/MTR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Std. Length</span>
                <span className="font-medium">{p.standardLength} MTR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Raw Stock</span>
                <Badge variant={p.currentStock <= p.lowStockThreshold ? "warning" : "success"}>
                  {formatNumber(p.currentStock)} KG
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coated Stock</span>
                <span className="font-medium">{formatNumber(p.powderCoatedStock)} KG</span>
              </div>
              <Badge variant={p.status === "ACTIVE" ? "success" : "secondary"}>{p.status}</Badge>
              {p.description && (
                <p className="text-sm text-muted-foreground border-t pt-3">{p.description}</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Stock Ledger History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.stockLedgers?.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDate(l.date)}</TableCell>
                      <TableCell>{l.transactionType.replace(/_/g, " ")}</TableCell>
                      <TableCell>{formatNumber(l.quantity)}</TableCell>
                      <TableCell>{formatNumber(l.balance)}</TableCell>
                      <TableCell>{l.user.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
