"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Search, Package } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";
import { safeFetchArray } from "@/lib/safe-fetch";
import { fallbackGalleryProfiles } from "@/lib/client-fallbacks";

interface GalleryProfile {
  id: string;
  profileCode: string;
  profileName: string;
  seriesName: string;
  weightPerMeter: number;
  imageUrl: string | null;
  currentStock: number;
}

export default function GalleryPage() {
  const [profiles, setProfiles] = useState<GalleryProfile[]>(fallbackGalleryProfiles);
  const [demoMode, setDemoMode] = useState(false);
  const [search, setSearch] = useState("");
  const [series, setSeries] = useState("");
  const [preview, setPreview] = useState<GalleryProfile | null>(null);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (series) params.set("series", series);
      const res = await safeFetchArray<GalleryProfile>(
        `/api/gallery?${params}`,
        fallbackGalleryProfiles
      );
      setProfiles(res.data);
      setDemoMode(res.demo);
    })();
  }, [search, series]);

  const seriesList = [...new Set(profiles.map((p) => p.seriesName))];

  return (
    <div>
      <PageHeader
        title="Profile Gallery"
        description="Visual catalogue of aluminium profiles with stock availability"
        demoMode={demoMode}
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search profiles..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={series || "all"} onValueChange={(v) => setSeries(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter series" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Series</SelectItem>
            {seriesList.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {profiles.map((p) => (
          <Card
            key={p.id}
            className="cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/20"
            onClick={() => setPreview(p)}
          >
            <div className="relative aspect-square bg-muted">
              {p.imageUrl ? (
                <Image src={p.imageUrl} alt={p.profileName} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground/20" />
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <p className="font-bold text-primary">{p.profileCode}</p>
              <p className="text-sm">{p.profileName}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{formatNumber(p.weightPerMeter)} KG/M</span>
                <Badge variant={p.currentStock < 50 ? "warning" : "success"}>
                  {formatNumber(p.currentStock)} KG
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-lg">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.profileCode} — {preview.profileName}</DialogTitle>
              </DialogHeader>
              <div className="relative aspect-video rounded-lg bg-muted overflow-hidden">
                {preview.imageUrl ? (
                  <Image src={preview.imageUrl} alt={preview.profileName} fill className="object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-20 w-20 text-muted-foreground/20" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Series:</span> {preview.seriesName}</div>
                <div><span className="text-muted-foreground">Weight:</span> {formatNumber(preview.weightPerMeter)} KG/M</div>
                <div><span className="text-muted-foreground">Stock:</span> {formatNumber(preview.currentStock)} KG</div>
              </div>
              <Link href={`/profiles/${preview.id}`} className="text-sm text-primary hover:underline">
                View full profile details →
              </Link>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
