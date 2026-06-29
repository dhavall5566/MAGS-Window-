import { NextRequest, NextResponse } from "next/server";
import { proxyMutateToBackend } from "@/lib/api/backend-proxy";
import { mergeVendorLists } from "@/lib/vendor-merge";
import type { Vendor } from "@/types";

const BACKEND_URL = process.env.MAGS_API_URL ?? "http://127.0.0.1:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/vendors`, { cache: "no-store" });
    const body = await res.text();

    if (!res.ok) {
      return new NextResponse(body, {
        status: res.status,
        headers: {
          "Content-Type": res.headers.get("Content-Type") ?? "application/json",
        },
      });
    }

    let payload: { vendors?: Vendor[] } = {};
    try {
      payload = JSON.parse(body) as { vendors?: Vendor[] };
    } catch {
      return new NextResponse(body, {
        status: res.status,
        headers: {
          "Content-Type": res.headers.get("Content-Type") ?? "application/json",
        },
      });
    }

    const vendors = mergeVendorLists(payload.vendors ?? [], []);
    return NextResponse.json({ vendors });
  } catch (error) {
    console.error("Backend proxy failed for /api/vendors:", error);
    const vendors = mergeVendorLists([], []);
    return NextResponse.json({ vendors });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyMutateToBackend("/api/vendors", { method: "POST", body });
}
