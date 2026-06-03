import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";
import { challanSchema } from "@/lib/validations";
import {
  generateChallanNumber,
  processChallanOutwardIssue,
  processChallanReturnComplete,
  logChallanActivity,
} from "@/lib/challan";
import type { ChallanStatus, ChallanType } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const type = req.nextUrl.searchParams.get("type") as ChallanType | null;
  const status = req.nextUrl.searchParams.get("status") as ChallanStatus | null;
  const vendorId = req.nextUrl.searchParams.get("vendorId") ?? undefined;
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;

  return NextResponse.json(
    db.getChallans({
      type: type ?? undefined,
      status: status ?? undefined,
      vendorId,
      projectId,
    })
  );
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = challanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { items, issueNow, completeReturn, ...rest } = parsed.data;
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const challanNumber = await generateChallanNumber(rest.type as ChallanType);

  let defaultStatus: ChallanStatus = "DRAFT";
  if (rest.type === "POWDER_COATING" && issueNow) {
    defaultStatus = "SENT_FOR_COATING";
  }

  const challan = db.createChallan(
    {
      challanNumber,
      type: rest.type as ChallanType,
      status: (rest.status as ChallanStatus) ?? defaultStatus,
      vendorId: rest.vendorId || undefined,
      projectId: rest.projectId || undefined,
      parentChallanId: rest.parentChallanId || undefined,
      color: rest.color,
      issueDate: rest.issueDate ? new Date(rest.issueDate).toISOString() : new Date().toISOString(),
      expectedReturnDate: rest.expectedReturnDate
        ? new Date(rest.expectedReturnDate).toISOString()
        : undefined,
      vehicleNo: rest.vehicleNo,
      driverName: rest.driverName,
      remarks: rest.remarks,
      preparedBy: rest.preparedBy ?? user.name,
      approvedBy: rest.approvedBy,
      receivedBy: rest.receivedBy,
      totalWeight,
      totalQty,
    },
    items
  );

  try {
    if (rest.type === "OUTWARD" && issueNow) {
      const issued = await processChallanOutwardIssue(challan.id, user.id);
      await logChallanActivity(user.id, "ISSUE", challan.id, `Issued ${challanNumber}`);
      return NextResponse.json(issued, { status: 201 });
    }
    if (rest.type === "RETURN" && completeReturn) {
      const completed = await processChallanReturnComplete(challan.id, user.id);
      await logChallanActivity(user.id, "COMPLETE", challan.id, `Completed ${challanNumber}`);
      return NextResponse.json(completed, { status: 201 });
    }
  } catch (e) {
    db.deleteChallan(challan.id);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Processing failed" },
      { status: 400 }
    );
  }

  await logChallanActivity(user.id, "CREATE", challan.id, `Created ${challanNumber}`);
  return NextResponse.json(challan, { status: 201 });
}
