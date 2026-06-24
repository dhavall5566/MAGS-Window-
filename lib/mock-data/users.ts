import type { User } from "@/types";

export const mockUsers: User[] = [
  {
    id: "usr-001",
    name: "Rajesh Kumar",
    email: "admin@mags.in",
    role: "administrator",
    department: "Administration",
    status: "active",
    lastLogin: "2026-06-03T08:30:00Z",
    avatar: "RK",
  },
  {
    id: "usr-002",
    name: "Priya Sharma",
    email: "store@mags.in",
    role: "store_manager",
    department: "Store",
    status: "active",
    lastLogin: "2026-06-03T09:15:00Z",
    avatar: "PS",
  },
  {
    id: "usr-003",
    name: "Amit Patel",
    email: "production@mags.in",
    role: "production_user",
    department: "Production",
    status: "active",
    lastLogin: "2026-06-02T16:45:00Z",
    avatar: "AP",
  },
  {
    id: "usr-004",
    name: "Suresh Mehta",
    email: "suresh@mags.in",
    role: "store_manager",
    department: "Store",
    status: "active",
    lastLogin: "2026-06-01T11:00:00Z",
    avatar: "SM",
  },
  {
    id: "usr-005",
    name: "Vikram Singh",
    email: "vikram@mags.in",
    role: "production_user",
    department: "Production",
    status: "inactive",
    lastLogin: "2026-05-20T10:00:00Z",
    avatar: "VS",
  },
];

export const demoCredentials = [
  {
    email: "admin@mags.in",
    password: "admin123",
    role: "administrator" as const,
    label: "Administrator",
  },
  {
    email: "store@mags.in",
    password: "store123",
    role: "store_manager" as const,
    label: "Store Manager",
  },
  {
    email: "production@mags.in",
    password: "prod123",
    role: "production_user" as const,
    label: "Production User",
  },
];
