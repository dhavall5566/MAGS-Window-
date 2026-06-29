import { NextRequest } from "next/server";
import { proxyMutateToBackend, proxyToBackend } from "@/lib/api/backend-proxy";

export async function GET() {
  return proxyToBackend("/api/app-settings");
}

export async function PUT(request: NextRequest) {
  const body = await request.text();
  return proxyMutateToBackend("/api/app-settings", { method: "PUT", body });
}
