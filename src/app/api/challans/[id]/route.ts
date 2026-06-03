import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";
import {
  processChallanOutwardIssue,
  processChallanReturnComplete,
  logChallanActivity,
} from "@/lib/challan";
import type { ChallanStatus } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const challan = db.getChallan(id);
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

  const challan = db.updateChallan(id, {
    ...(status ? { status: status as ChallanStatus } : {}),
    ...updates,
  });

  return NextResponse.json(challan);
}
