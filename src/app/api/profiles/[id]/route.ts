import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { profileSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: {
      stockInwards: { take: 10, orderBy: { date: "desc" } },
      consumptions: { take: 10, orderBy: { date: "desc" } },
      powderCoatings: { take: 10, orderBy: { transferDate: "desc" } },
      stockLedgers: { take: 15, orderBy: { date: "desc" }, include: { user: { select: { name: true } } } },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = profileSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await prisma.profile.update({
    where: { id },
    data: parsed.data,
  });

  if (user) {
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        entity: "Profile",
        entityId: profile.id,
        details: `Updated profile ${profile.profileCode}`,
      },
    });
  }

  return NextResponse.json(profile);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const profile = await prisma.profile.update({
    where: { id },
    data: { status: "INACTIVE" },
  });

  if (user) {
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        entity: "Profile",
        entityId: profile.id,
        details: `Deactivated profile ${profile.profileCode}`,
      },
    });
  }

  return NextResponse.json(profile);
}
