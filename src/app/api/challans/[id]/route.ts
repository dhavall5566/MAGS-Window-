import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import {
  processChallanOutwardIssue,
  processChallanReturnComplete,
  logChallanActivity,
} from "@/lib/challan";
import { ChallanStatus } from "@prisma/client";

const includeChallan = {
  items: { include: { profile: true } },
  vendor: true,
  project: true,
  parentChallan: {
    include: { items: { include: { profile: true } }, vendor: true },
  },
  childChallans: {
    include: { vendor: true },
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const challan = await prisma.challan.findUnique({
    where: { id },
    include: includeChallan,
  });
  if (!challan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(challan);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth();
  if (error || !user) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action, status, ...updates } = body;

  try {
    if (action === "issue") {
      const issued = await processChallanOutwardIssue(id, user.id);
      await logChallanActivity(user.id, "ISSUE", id, `Issued ${issued.challanNumber}`);
      return NextResponse.json(issued);
    }
    if (action === "complete_return") {
      const completed = await processChallanReturnComplete(id, user.id);
      await logChallanActivity(user.id, "COMPLETE", id, `Completed ${completed.challanNumber}`);
      return NextResponse.json(completed);
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Action failed" },
      { status: 400 }
    );
  }

  const challan = await prisma.challan.update({
    where: { id },
    data: {
      ...(status ? { status: status as ChallanStatus } : {}),
      ...updates,
    },
    include: includeChallan,
  });

  return NextResponse.json(challan);
}
