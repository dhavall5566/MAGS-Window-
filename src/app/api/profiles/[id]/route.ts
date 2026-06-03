import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";
import { profileSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const profile = db.getProfile(id);

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

  try {
    const profile = db.updateProfile(id, parsed.data);
    if (user) {
      db.createActivityLog({
        userId: user.id,
        action: "UPDATE",
        entity: "Profile",
        entityId: profile.id,
        details: `Updated profile ${profile.profileCode}`,
      });
    }
    return NextResponse.json(profile);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const profile = db.updateProfile(id, { status: "INACTIVE" });

  if (user) {
    db.createActivityLog({
      userId: user.id,
      action: "DELETE",
      entity: "Profile",
      entityId: profile.id,
      details: `Deactivated profile ${profile.profileCode}`,
    });
  }

  return NextResponse.json(profile);
}
