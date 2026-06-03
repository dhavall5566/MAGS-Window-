import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { profileSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const series = req.nextUrl.searchParams.get("series") ?? "";
  const status = req.nextUrl.searchParams.get("status");

  const profiles = await prisma.profile.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { profileCode: { contains: search, mode: "insensitive" } },
                { profileName: { contains: search, mode: "insensitive" } },
                { seriesName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        series ? { seriesName: series } : {},
        status ? { status: status as "ACTIVE" | "INACTIVE" } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  const seriesList = await prisma.profile.findMany({
    select: { seriesName: true },
    distinct: ["seriesName"],
  });

  return NextResponse.json({
    profiles,
    seriesList: seriesList.map((s) => s.seriesName),
  });
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.profile.findUnique({
    where: { profileCode: parsed.data.profileCode },
  });
  if (existing) {
    return NextResponse.json({ error: "Profile code already exists" }, { status: 409 });
  }

  const profile = await prisma.profile.create({ data: parsed.data });

  if (user) {
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entity: "Profile",
        entityId: profile.id,
        details: `Created profile ${profile.profileCode}`,
      },
    });
  }

  return NextResponse.json(profile, { status: 201 });
}
