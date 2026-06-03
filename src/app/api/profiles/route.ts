import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";
import { profileSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const series = req.nextUrl.searchParams.get("series") ?? undefined;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;

  const profiles = db.getProfiles({ search, series, status });

  return NextResponse.json({
    profiles,
    seriesList: db.getSeriesList(),
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

  try {
    const profile = db.createProfile(parsed.data);
    if (user) {
      db.createActivityLog({
        userId: user.id,
        action: "CREATE",
        entity: "Profile",
        entityId: profile.id,
        details: `Created profile ${profile.profileCode}`,
      });
    }
    return NextResponse.json(profile, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    const status = msg.includes("exists") ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
