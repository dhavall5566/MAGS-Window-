import type { UserRole } from "./types";
import { mockUsers } from "./mock-data";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

/** Demo mode: always use the first active mock user for audit logs. */
export async function getSystemUser(): Promise<AppUser> {
  const user =
    mockUsers.find((u) => u.status === "ACTIVE") ?? mockUsers[0];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function requireAuth() {
  const user = await getSystemUser();
  return { error: null, user };
}
