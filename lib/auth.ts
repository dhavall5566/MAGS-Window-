import type { User, UserRole } from "@/types";
import { demoCredentials, mockUsers } from "@/lib/mock-data/users";
import {
  DEFAULT_ROLE_PERMISSIONS,
  hasRolePermission,
} from "@/lib/role-permissions";

const AUTH_KEY = "mags_auth_session";

/** Default user when login is disabled (full admin access for demo). */
export function getDefaultUser(): User {
  return (
    mockUsers.find((u) => u.role === "administrator") ??
    mockUsers[0] ?? {
      id: "demo",
      name: "Demo User",
      email: "demo@mags.in",
      role: "administrator",
      department: "Administration",
      status: "active",
    }
  );
}

/** Active session user, or demo default when not logged in. */
export function getCurrentUser(): User {
  return getSession()?.user ?? getDefaultUser();
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

export function login(
  email: string,
  password: string
): { success: true; session: AuthSession } | { success: false; error: string } {
  const credential = demoCredentials.find(
    (c) => c.email === email && c.password === password
  );
  if (!credential) {
    return { success: false, error: "Invalid email or password" };
  }

  const user = mockUsers.find((u) => u.email === email);
  if (!user) {
    return { success: false, error: "User not found" };
  }

  const session: AuthSession = {
    user,
    token: `demo-token-${user.id}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  }

  return { success: true, session };
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_KEY);
  }
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (new Date(session.expiresAt) < new Date()) {
      logout();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function hasPermission(
  role: UserRole | undefined,
  required: UserRole[]
): boolean {
  return hasRolePermission(role, required);
}

/** @deprecated Use store-backed rolePermissions via canAccessModule */
export const rolePermissions = DEFAULT_ROLE_PERMISSIONS;
