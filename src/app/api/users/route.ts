import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";
import { userSchema } from "@/lib/validations";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const users = db.getUsers().map(({ id, name, email, role, status, createdAt }) => ({
    id,
    name,
    email,
    role,
    status,
    createdAt,
  }));

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { error, user: sessionUser } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const user = db.createUser({
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      status: parsed.data.status,
    });

    if (sessionUser) {
      db.createActivityLog({
        userId: sessionUser.id,
        action: "CREATE",
        entity: "User",
        entityId: user.id,
        details: `Created user ${user.email}`,
      });
    }

    const { id, name, email, role, status, createdAt } = user;
    return NextResponse.json({ id, name, email, role, status, createdAt }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: msg.includes("exists") ? 409 : 400 });
  }
}
