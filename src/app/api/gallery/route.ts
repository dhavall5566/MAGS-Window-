import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const series = req.nextUrl.searchParams.get("series") ?? undefined;

  const profiles = db
    .getProfiles({ search, series, status: "ACTIVE" })
    .map((p) => ({
      id: p.id,
      profileCode: p.profileCode,
      profileName: p.profileName,
      seriesName: p.seriesName,
      weightPerMeter: p.weightPerMeter,
      imageUrl: p.imageUrl,
      currentStock: p.currentStock,
      powderCoatedStock: p.powderCoatedStock,
    }))
    .sort((a, b) => a.profileCode.localeCompare(b.profileCode));

  return NextResponse.json(profiles);
}
