import { NextRequest, NextResponse } from "next/server";
import { proxyMutateToBackend } from "@/lib/api/backend-proxy";
import { mergeUsersLists } from "@/lib/user-merge";
import type { User } from "@/types";

const BACKEND_URL = process.env.MAGS_API_URL ?? "http://127.0.0.1:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/users`, { cache: "no-store" });
    const body = await res.text();

    if (!res.ok) {
      return new NextResponse(body, {
        status: res.status,
        headers: {
          "Content-Type": res.headers.get("Content-Type") ?? "application/json",
        },
      });
    }

    let payload: { users?: User[] } = {};
    try {
      payload = JSON.parse(body) as { users?: User[] };
    } catch {
      return new NextResponse(body, {
        status: res.status,
        headers: {
          "Content-Type": res.headers.get("Content-Type") ?? "application/json",
        },
      });
    }

    const users = mergeUsersLists(payload.users ?? [], []);
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Backend proxy failed for /api/users:", error);
    const users = mergeUsersLists([], []);
    return NextResponse.json({ users });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyMutateToBackend("/api/users", { method: "POST", body });
}
