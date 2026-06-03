import { NextResponse } from "next/server";
import { db } from "./data-access";
import type { UserRole } from "./types";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

/** Resolves the active system user for audit logs (no login required). */
export async function getSystemUser(): Promise<AppUser | null> {
  try {
    const user = db.getActiveUser();
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
        { error: "Data store not ready. Ensure data/database.json exists." },
        { status: 503 }
      ),
      user: null,
    };
  }
  return { error: null, user };
}
