import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";
import { stockInwardSchema } from "@/lib/validations";
import { processStockInward } from "@/lib/stock";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  return NextResponse.json(db.getStockInwards());
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = stockInwardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const date = parsed.data.date ? new Date(parsed.data.date) : new Date();

  const entry = db.createStockInward({
    profileId: parsed.data.profileId,
    quantity: parsed.data.quantity,
    length: parsed.data.length,
    weight: parsed.data.weight,
    date: date.toISOString(),
    remarks: parsed.data.remarks,
  });

  await processStockInward(
    parsed.data.profileId,
    parsed.data.weight,
    user.id,
    parsed.data.remarks,
    date
  );

  return NextResponse.json(entry, { status: 201 });
}
