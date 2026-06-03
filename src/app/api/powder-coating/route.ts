import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { powderCoatingSchema } from "@/lib/validations";
import { processPowderTransfer, completePowderCoating } from "@/lib/stock";
import { PowderCoatingStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const color = req.nextUrl.searchParams.get("color");
  const status = req.nextUrl.searchParams.get("status");

  const entries = await prisma.powderCoating.findMany({
    where: {
      ...(color ? { color: color as never } : {}),
      ...(status ? { status: status as PowderCoatingStatus } : {}),
    },
    orderBy: { transferDate: "desc" },
    include: {
      profile: {
        select: {
          profileCode: true,
          profileName: true,
          imageUrl: true,
          currentStock: true,
          powderCoatedStock: true,
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
  const parsed = powderCoatingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.status !== PowderCoatingStatus.PENDING) {
      await processPowderTransfer(
        parsed.data.profileId,
        parsed.data.weight,
        user.id,
        parsed.data.remarks
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Stock error" },
      { status: 400 }
    );
  }

  const entry = await prisma.powderCoating.create({
    data: {
      profileId: parsed.data.profileId,
      quantity: parsed.data.quantity,
      weight: parsed.data.weight,
      color: parsed.data.color,
      transferDate: parsed.data.transferDate
        ? new Date(parsed.data.transferDate)
        : new Date(),
      status: parsed.data.status,
      remarks: parsed.data.remarks,
    },
    include: { profile: true },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status } = await req.json();
  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  if (status === PowderCoatingStatus.COMPLETED) {
    try {
      await completePowderCoating(id, user.id);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Error" },
        { status: 400 }
      );
    }
  }

  const entry = await prisma.powderCoating.update({
    where: { id },
    data: { status },
    include: { profile: true },
  });

  return NextResponse.json(entry);
}
