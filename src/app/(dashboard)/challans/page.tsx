"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ChallanItemsForm, ChallanLineItem } from "@/components/challans/challan-items-form";
import { POWDER_COLORS } from "@/lib/constants";
import { CHALLAN_STATUS_LABELS, CHALLAN_TYPE_LABELS } from "@/lib/challan-labels";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import {
  Truck,
  Paintbrush,
  RotateCcw,
  Building2,
  Loader2,
  Eye,
} from "lucide-react";
import { safeFetchArray, safeFetchJson } from "@/lib/safe-fetch";
import {
  fallbackChallanMetrics,
  fallbackChallans,
  fallbackOutwardChallans,
  fallbackProfilesResponse,
  fallbackProjects,
  fallbackVendors,
  fallbackChallanById,
} from "@/lib/client-fallbacks";

type ChallanRow = {
  id: string;
  challanNumber: string;
  type: string;
  status: string;
  totalWeight: number;
  issueDate: string;
  color?: string | null;
  vendor?: { name: string } | null;
  project?: { projectCode: string } | null;
  parentChallan?: { challanNumber: string } | null;
};

export default function ChallansPage() {
  const [metrics, setMetrics] = useState(fallbackChallanMetrics);
  const [challans, setChallans] = useState<ChallanRow[]>(
    fallbackChallans as unknown as ChallanRow[]
  );
  const [vendors, setVendors] = useState(fallbackVendors);
  const [projects, setProjects] = useState(
    fallbackProjects as { id: string; projectCode: string; projectName: string }[]
  );
  const [profiles, setProfiles] = useState(
    fallbackProfilesResponse.profiles as {
      id: string;
      profileCode: string;
      profileName: string;
      weightPerMeter: number;
      currentStock: number;
      imageUrl?: string | null;
    }[]
  );
  const [outwardChallans, setOutwardChallans] = useState<ChallanRow[]>(
    fallbackOutwardChallans as unknown as ChallanRow[]
  );
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [outwardForm, setOutwardForm] = useState({
    vendorId: "",
    projectId: "",
    vehicleNo: "",
    driverName: "",
    remarks: "",
    issueNow: true,
    items: [{ profileId: "", quantity: 1, length: 6, weight: 0 }] as ChallanLineItem[],
  });

  const [pcForm, setPcForm] = useState({
    parentChallanId: "",
    vendorId: "",
    color: "WHITE",
    status: "SENT_FOR_COATING",
    remarks: "",
    items: [{ profileId: "", quantity: 1, length: 6, weight: 0 }] as ChallanLineItem[],
  });

  const [returnForm, setReturnForm] = useState({
    parentChallanId: "",
    vendorId: "",
    receivedBy: "",
    remarks: "",
    completeReturn: true,
    items: [{ profileId: "", quantity: 1, length: 6, weight: 0 }] as ChallanLineItem[],
  });

  const [projectForm, setProjectForm] = useState({
    projectCode: "",
    projectName: "",
    clientName: "",
    siteAddress: "",
    profiles: [] as { profileId: string; plannedQty: number; plannedLength: number }[],
  });

  const [vendorForm, setVendorForm] = useState({ name: "", contactPerson: "", phone: "", address: "" });

  const load = async () => {
    let demo = false;
    const mRes = await safeFetchJson("/api/challans/metrics", fallbackChallanMetrics, (d) =>
      typeof d === "object" &&
      d !== null &&
      "materialSentForCoating" in d &&
      Array.isArray((d as { vendorWise?: unknown }).vendorWise)
    );
    setMetrics(mRes.data);
    if (mRes.demo) demo = true;

    const cRes = await safeFetchArray("/api/challans", fallbackChallans);
    setChallans(cRes.data as unknown as ChallanRow[]);
    if (cRes.demo) demo = true;

    const oRes = await safeFetchArray(
      "/api/challans?type=OUTWARD",
      fallbackOutwardChallans
    );
    setOutwardChallans(oRes.data as unknown as ChallanRow[]);
    if (oRes.demo) demo = true;

    const vRes = await safeFetchArray("/api/vendors", fallbackVendors);
    setVendors(vRes.data);
    if (vRes.demo) demo = true;

    const pRes = await safeFetchArray("/api/projects", fallbackProjects);
    setProjects(pRes.data as typeof projects);
    if (pRes.demo) demo = true;

    const profRes = await safeFetchJson(
      "/api/profiles",
      fallbackProfilesResponse,
      (d) =>
        typeof d === "object" &&
        d !== null &&
        Array.isArray((d as { profiles?: unknown }).profiles)
    );
    setProfiles((profRes.data.profiles ?? []) as typeof profiles);
    if (profRes.demo) demo = true;

    setDemoMode(demo);
  };

  useEffect(() => {
    load();
  }, []);

  const submitChallan = async (
    type: "OUTWARD" | "POWDER_COATING" | "RETURN",
    form: Record<string, unknown>
  ) => {
    setLoading(true);
    const res = await fetch("/api/challans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...form }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to create challan");
      return;
    }
    const data = await res.json();
    toast.success(`Challan ${data.challanNumber} created`);
    load();
  };

  const loadParentItems = async (parentId: string, setter: (items: ChallanLineItem[]) => void) => {
    const fallback = fallbackChallanById(parentId);
    const { data: parent, demo } = await safeFetchJson(
      `/api/challans/${parentId}`,
      fallback,
      (d) => typeof d === "object" && d !== null && "items" in d
    );
    if (demo) setDemoMode(true);
    const items = (parent as { items?: { profileId: string; quantity: number; length?: number; weight: number }[] })
      .items;
    setter(
      (items ?? []).map((i) => ({
        profileId: i.profileId,
        quantity: i.quantity,
        length: i.length ?? 6,
        weight: i.weight,
      }))
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Challan Management"
        description="Outward, powder coating, return challans with PDF, print, and project workflows"
        demoMode={demoMode}
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="outward">Outward</TabsTrigger>
          <TabsTrigger value="powder">Powder Coating</TabsTrigger>
          <TabsTrigger value="return">Return</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="all">All Challans</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Material Sent for Coating"
              value={`${formatNumber(metrics?.materialSentForCoating ?? 0)} KG`}
              icon={Truck}
              href="/challans?tab=outward"
            />
            <StatCard
              title="Material Returned"
              value={`${formatNumber(metrics?.materialReturned ?? 0)} KG`}
              icon={RotateCcw}
              variant="success"
              href="/challans?tab=return"
            />
            <StatCard
              title="Pending Coating"
              value={metrics?.pendingCoating ?? 0}
              icon={Paintbrush}
              variant="warning"
              href="/challans?tab=powder"
            />
            <StatCard title="Active Vendors" value={vendors.length} icon={Building2} href="/challans?tab=vendors" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Vendor-wise Summary</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Challans</TableHead>
                    <TableHead>Total Weight (KG)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(metrics?.vendorWise ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-muted-foreground">No data yet</TableCell></TableRow>
                  ) : (
                    (metrics?.vendorWise ?? []).map((v, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{v.vendorName}</TableCell>
                        <TableCell>{v.challanCount}</TableCell>
                        <TableCell>{formatNumber(v.totalWeight)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outward" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">New Outward Challan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Vendor *</Label>
                    <Select value={outwardForm.vendorId} onValueChange={(v) => setOutwardForm({ ...outwardForm, vendorId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                      <SelectContent>
                        {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Project (optional)</Label>
                    <Select value={outwardForm.projectId || "none"} onValueChange={(v) => setOutwardForm({ ...outwardForm, projectId: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.projectCode}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vehicle No.</Label>
                    <Input value={outwardForm.vehicleNo} onChange={(e) => setOutwardForm({ ...outwardForm, vehicleNo: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Driver</Label>
                    <Input value={outwardForm.driverName} onChange={(e) => setOutwardForm({ ...outwardForm, driverName: e.target.value })} />
                  </div>
                </div>
                <ChallanItemsForm profiles={profiles} items={outwardForm.items} onChange={(items) => setOutwardForm({ ...outwardForm, items })} />
                <Textarea placeholder="Remarks" value={outwardForm.remarks} onChange={(e) => setOutwardForm({ ...outwardForm, remarks: e.target.value })} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={outwardForm.issueNow} onChange={(e) => setOutwardForm({ ...outwardForm, issueNow: e.target.checked })} />
                  Issue now & deduct inventory
                </label>
                <Button
                  disabled={loading || !outwardForm.vendorId || outwardForm.items.some((i) => !i.profileId || !i.weight)}
                  onClick={() => submitChallan("OUTWARD", outwardForm)}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Outward Challan
                </Button>
              </CardContent>
            </Card>
            <ChallanList challans={(challans ?? []).filter((c) => c.type === "OUTWARD")} title="Outward Challans" />
          </div>
        </TabsContent>

        <TabsContent value="powder" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Powder Coating Challan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Link to Outward Challan</Label>
                  <Select
                    value={pcForm.parentChallanId}
                    onValueChange={(v) => {
                      setPcForm({ ...pcForm, parentChallanId: v });
                      loadParentItems(v, (items) => setPcForm((f) => ({ ...f, items })));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select outward challan" /></SelectTrigger>
                    <SelectContent>
                      {(outwardChallans ?? []).filter((c) => c.status === "ISSUED").map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.challanNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Vendor</Label>
                    <Select value={pcForm.vendorId} onValueChange={(v) => setPcForm({ ...pcForm, vendorId: v })}>
                      <SelectTrigger><SelectValue placeholder="Coating vendor" /></SelectTrigger>
                      <SelectContent>
                        {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <Select value={pcForm.color} onValueChange={(v) => setPcForm({ ...pcForm, color: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {POWDER_COLORS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <ChallanItemsForm profiles={profiles} items={pcForm.items} onChange={(items) => setPcForm({ ...pcForm, items })} />
                <Button
                  disabled={loading || !pcForm.parentChallanId}
                  onClick={() => submitChallan("POWDER_COATING", { ...pcForm, issueNow: true })}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Powder Coating Challan
                </Button>
              </CardContent>
            </Card>
            <ChallanList challans={(challans ?? []).filter((c) => c.type === "POWDER_COATING")} title="Powder Coating Challans" />
          </div>
        </TabsContent>

        <TabsContent value="return" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Return Challan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Link to Challan</Label>
                  <Select
                    value={returnForm.parentChallanId}
                    onValueChange={(v) => {
                      setReturnForm({ ...returnForm, parentChallanId: v });
                      loadParentItems(v, (items) => setReturnForm((f) => ({ ...f, items })));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Outward / PC challan" /></SelectTrigger>
                    <SelectContent>
                      {(challans ?? []).filter((c) => c.type !== "RETURN").map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.challanNumber} ({c.type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Received By</Label>
                  <Input value={returnForm.receivedBy} onChange={(e) => setReturnForm({ ...returnForm, receivedBy: e.target.value })} />
                </div>
                <ChallanItemsForm profiles={profiles} items={returnForm.items} onChange={(items) => setReturnForm({ ...returnForm, items })} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={returnForm.completeReturn} onChange={(e) => setReturnForm({ ...returnForm, completeReturn: e.target.checked })} />
                  Complete & move to coated stock
                </label>
                <Button
                  disabled={loading || !returnForm.parentChallanId}
                  onClick={() => submitChallan("RETURN", returnForm)}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Return Challan
                </Button>
              </CardContent>
            </Card>
            <ChallanList challans={(challans ?? []).filter((c) => c.type === "RETURN")} title="Return Challans" />
          </div>
        </TabsContent>

        <TabsContent value="projects" className="mt-4 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Create Project</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Project Code" value={projectForm.projectCode} onChange={(e) => setProjectForm({ ...projectForm, projectCode: e.target.value })} />
                <Input placeholder="Project Name" value={projectForm.projectName} onChange={(e) => setProjectForm({ ...projectForm, projectName: e.target.value })} />
                <Input placeholder="Client Name" value={projectForm.clientName} onChange={(e) => setProjectForm({ ...projectForm, clientName: e.target.value })} />
                <Input placeholder="Site Address" value={projectForm.siteAddress} onChange={(e) => setProjectForm({ ...projectForm, siteAddress: e.target.value })} />
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  setProjectForm({
                    ...projectForm,
                    profiles: [...projectForm.profiles, { profileId: "", plannedQty: 1, plannedLength: 6 }],
                  })
                }
              >
                Add Profile to Project
              </Button>
              {projectForm.profiles.map((pp, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <Select
                    value={pp.profileId}
                    onValueChange={(v) => {
                      const next = [...projectForm.profiles];
                      next[i].profileId = v;
                      setProjectForm({ ...projectForm, profiles: next });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Profile" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.profileCode}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Qty" value={pp.plannedQty} onChange={(e) => {
                    const next = [...projectForm.profiles];
                    next[i].plannedQty = Number(e.target.value);
                    setProjectForm({ ...projectForm, profiles: next });
                  }} />
                  <Input type="number" placeholder="Length" value={pp.plannedLength} onChange={(e) => {
                    const next = [...projectForm.profiles];
                    next[i].plannedLength = Number(e.target.value);
                    setProjectForm({ ...projectForm, profiles: next });
                  }} />
                </div>
              ))}
              <Button
                onClick={async () => {
                  const res = await fetch("/api/projects", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(projectForm),
                  });
                  if (!res.ok) { toast.error("Failed"); return; }
                  toast.success("Project created");
                  load();
                }}
              >
                Save Project
              </Button>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {(projects ?? []).map((p) => (
              <Card key={p.id}>
                <CardContent className="pt-6 flex items-center justify-between">
                  <div>
                    <p className="font-bold">{p.projectCode}</p>
                    <p className="text-sm text-muted-foreground">{p.projectName}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      const vendorId = vendors[0]?.id;
                      if (!vendorId) { toast.error("Add a vendor first"); return; }
                      const res = await fetch(`/api/projects/${p.id}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ vendorId, issueNow: true }),
                      });
                      if (!res.ok) { const e = await res.json(); toast.error(e.error ?? "Failed"); return; }
                      const c = await res.json();
                      toast.success(`Challan ${c.challanNumber} generated`);
                      load();
                    }}
                  >
                    Auto Challan
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader><CardTitle className="text-base">Add Vendor</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Vendor name" value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} />
              <Input placeholder="Contact person" value={vendorForm.contactPerson} onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })} />
              <Input placeholder="Phone" value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
              <Textarea placeholder="Address" value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} />
              <Button
                onClick={async () => {
                  const res = await fetch("/api/vendors", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(vendorForm),
                  });
                  if (!res.ok) { toast.error("Failed"); return; }
                  toast.success("Vendor added");
                  setVendorForm({ name: "", contactPerson: "", phone: "", address: "" });
                  load();
                }}
              >
                Add Vendor
              </Button>
            </CardContent>
          </Card>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(vendors ?? []).map((v) => (
              <Card key={v.id}><CardContent className="pt-4 font-medium">{v.name}</CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <ChallanList challans={challans ?? []} title="All Challans" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChallanList({ challans, title }: { challans: ChallanRow[]; title: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {challans.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground">No challans</TableCell></TableRow>
            ) : (
              challans.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.challanNumber}</TableCell>
                  <TableCell>{CHALLAN_TYPE_LABELS[c.type as keyof typeof CHALLAN_TYPE_LABELS]}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{CHALLAN_STATUS_LABELS[c.status as keyof typeof CHALLAN_STATUS_LABELS]}</Badge>
                  </TableCell>
                  <TableCell>{formatNumber(c.totalWeight)} KG</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/challans/${c.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
