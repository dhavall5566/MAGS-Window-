import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const series = req.nextUrl.searchParams.get("series") ?? "";

  const profiles = await prisma.profile.findMany({
    where: {
      status: "ACTIVE",
      AND: [
        search
          ? {
              OR: [
                { profileCode: { contains: search, mode: "insensitive" } },
                { profileName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        series ? { seriesName: series } : {},
      ],
    },
    select: {
      id: true,
      profileCode: true,
      profileName: true,
      seriesName: true,
      weightPerMeter: true,
      imageUrl: true,
      currentStock: true,
      powderCoatedStock: true,
    },
    orderBy: { profileCode: "asc" },
  });

  return NextResponse.json(profiles);
}
