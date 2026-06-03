"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, LayoutGrid, List } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { Package } from "lucide-react";
import { safeFetchJson } from "@/lib/safe-fetch";
import { fallbackProfilesResponse } from "@/lib/client-fallbacks";

interface Profile {
  id: string;
  profileCode: string;
  profileName: string;
  seriesName: string;
  weightPerMeter: number;
  currentStock: number;
  imageUrl: string | null;
  status: string;
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>(
    fallbackProfilesResponse.profiles as Profile[]
  );
  const [seriesList, setSeriesList] = useState<string[]>(
    fallbackProfilesResponse.seriesList
  );
  const [demoMode, setDemoMode] = useState(false);
  const [search, setSearch] = useState("");
  const [series, setSeries] = useState("");
  const [view, setView] = useState<"table" | "card">("table");

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (series) params.set("series", series);
      const res = await safeFetchJson(
        `/api/profiles?${params}`,
        fallbackProfilesResponse,
        (d) =>
          typeof d === "object" &&
          d !== null &&
          Array.isArray((d as { profiles?: unknown }).profiles)
      );
      setProfiles((res.data.profiles ?? []) as Profile[]);
      setSeriesList(res.data.seriesList ?? []);
      setDemoMode(res.demo);
    })();
  }, [search, series]);

  return (
    <div>
      <PageHeader
        title="Profile Master"
        description="Manage aluminium extrusion profiles and specifications"
        demoMode={demoMode}
      >
        <Button asChild>
          <Link href="/profiles/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Profile
          </Link>
        </Button>
      </PageHeader>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code, name, or series..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={series || "all"} onValueChange={(v) => setSeries(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Series" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Series</SelectItem>
            {seriesList.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Tabs value={view} onValueChange={(v) => setView(v as "table" | "card")}>
          <TabsList>
            <TabsTrigger value="table"><List className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="card"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No profiles found"
          description="Create your first aluminium profile to get started."
          action={
            <Button asChild>
              <Link href="/profiles/new">Add Profile</Link>
            </Button>
          }
        />
      ) : view === "table" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>KG/MTR</TableHead>
                <TableHead>Stock (KG)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.profileCode}</TableCell>
                  <TableCell>{p.profileName}</TableCell>
                  <TableCell>{p.seriesName}</TableCell>
                  <TableCell>{formatNumber(p.weightPerMeter)}</TableCell>
                  <TableCell>{formatNumber(p.currentStock)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "ACTIVE" ? "success" : "secondary"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/profiles/${p.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {profiles.map((p) => (
            <Link key={p.id} href={`/profiles/${p.id}`}>
              <Card className="overflow-hidden transition-shadow hover:shadow-md">
                <div className="relative h-40 bg-muted">
                  {p.imageUrl ? (
                    <Image src={p.imageUrl} alt={p.profileName} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <p className="font-bold">{p.profileCode}</p>
                  <p className="text-sm text-muted-foreground">{p.profileName}</p>
                  <div className="mt-2 flex justify-between text-xs">
                    <span>{p.seriesName}</span>
                    <span className="font-medium">{formatNumber(p.currentStock)} KG</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
