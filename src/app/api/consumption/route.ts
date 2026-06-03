import { NextRequest, NextResponse } from "next/server";
import { db, getProfileById } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";
import { consumptionSchema } from "@/lib/validations";
import { processConsumption } from "@/lib/stock";
import { calculateWeight } from "@/lib/utils";
import { read } from "@/lib/mock-store";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  return NextResponse.json(db.getConsumptions());
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = consumptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = read((d) => getProfileById(d, parsed.data.profileId));
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const calculatedWeight = calculateWeight(
    parsed.data.quantity,
    profile.weightPerMeter,
    parsed.data.unit
  );

  const date = parsed.data.date ? new Date(parsed.data.date) : new Date();

  try {
    await processConsumption(
      parsed.data.profileId,
      calculatedWeight,
      user.id,
      parsed.data.remarks,
      date
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Stock error" },
      { status: 400 }
    );
  }

  const entry = db.createConsumption({
    profileId: parsed.data.profileId,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    calculatedWeight,
    date: date.toISOString(),
    remarks: parsed.data.remarks,
  });

  return NextResponse.json(entry, { status: 201 });
}
