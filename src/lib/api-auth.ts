import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { UserRole } from "@prisma/client";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

/** Resolves the active system user for audit logs (no login required). */
export async function getSystemUser(): Promise<AppUser | null> {
  try {
    const user = await prisma.user.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const user = await getSystemUser();
  if (!user) {
    return {
      error: NextResponse.json(
        {
          error:
            "Database not ready. Start PostgreSQL and run: npm run db:push && npm run db:seed",
        },
        { status: 503 }
      ),
      user: null,
    };
  }
  return { error: null, user };
}
