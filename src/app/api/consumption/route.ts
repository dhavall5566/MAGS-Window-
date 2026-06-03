import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { consumptionSchema } from "@/lib/validations";
import { processConsumption } from "@/lib/stock";
import { calculateWeight } from "@/lib/utils";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const entries = await prisma.consumption.findMany({
    orderBy: { date: "desc" },
    include: {
      profile: {
        select: {
          profileCode: true,
          profileName: true,
          imageUrl: true,
          weightPerMeter: true,
        },
      },
    },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = consumptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await prisma.profile.findUniqueOrThrow({
    where: { id: parsed.data.profileId },
  });

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

  const entry = await prisma.consumption.create({
    data: {
      profileId: parsed.data.profileId,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      calculatedWeight,
      date,
      remarks: parsed.data.remarks,
    },
    include: { profile: true },
  });

  return NextResponse.json(entry, { status: 201 });
}
