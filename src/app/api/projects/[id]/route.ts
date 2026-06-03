import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { generateChallanNumber } from "@/lib/challan";
import { ChallanType, ChallanStatus } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      profiles: { include: { profile: true } },
      challans: { include: { vendor: true, items: true } },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

/** Auto-generate outward challans from project profiles */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth();
  if (error || !user) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { vendorId, issueNow } = await req.json();

  const project = await prisma.project.findUnique({
    where: { id },
    include: { profiles: { include: { profile: true } } },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.profiles.length === 0) {
    return NextResponse.json({ error: "No profiles attached" }, { status: 400 });
  }

  const items = project.profiles.map((pp) => {
    const length = pp.plannedLength ?? pp.profile.standardLength;
    const weight = length * pp.plannedQty * pp.profile.weightPerMeter;
    return {
      profileId: pp.profileId,
      quantity: pp.plannedQty,
      length,
      weight,
    };
  });

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const challanNumber = await generateChallanNumber(ChallanType.OUTWARD);

  const challan = await prisma.challan.create({
    data: {
      challanNumber,
      type: ChallanType.OUTWARD,
      status: ChallanStatus.DRAFT,
      vendorId: vendorId || undefined,
      projectId: id,
      totalWeight,
      totalQty,
      preparedBy: user.name,
      items: { create: items },
    },
    include: {
      items: { include: { profile: true } },
      vendor: true,
      project: true,
    },
  });

  if (issueNow) {
    const { processChallanOutwardIssue } = await import("@/lib/challan");
    try {
      const issued = await processChallanOutwardIssue(challan.id, user.id);
      return NextResponse.json(issued, { status: 201 });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Issue failed", challan },
        { status: 400 }
      );
    }
  }

  return NextResponse.json(challan, { status: 201 });
}
