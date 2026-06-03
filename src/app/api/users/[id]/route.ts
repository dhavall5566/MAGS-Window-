import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";
import { userSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user: sessionUser } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = userSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { password: _pw, ...data } = parsed.data;

  try {
    const user = db.updateUser(id, data);
    if (sessionUser) {
      db.createActivityLog({
        userId: sessionUser.id,
        action: "UPDATE",
        entity: "User",
        entityId: user.id,
        details: `Updated user ${user.email}`,
      });
    }
    const { id: uid, name, email, role, status, createdAt } = user;
    return NextResponse.json({ id: uid, name, email, role, status, createdAt });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 404 }
    );
  }
}
