import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { scrapSchema } from "@/lib/validations";
import { processScrap } from "@/lib/stock";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const entries = await prisma.scrapWaste.findMany({
    orderBy: { date: "desc" },
    include: {
      profile: {
        select: { profileCode: true, profileName: true, imageUrl: true },
      },
    },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = scrapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const date = parsed.data.date ? new Date(parsed.data.date) : new Date();

  try {
    await processScrap(
      parsed.data.profileId,
      parsed.data.quantity,
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

  const entry = await prisma.scrapWaste.create({
    data: {
      profileId: parsed.data.profileId,
      quantity: parsed.data.quantity,
      reason: parsed.data.reason,
      remarks: parsed.data.remarks,
      date,
    },
    include: { profile: true },
  });

  return NextResponse.json(entry, { status: 201 });
}
