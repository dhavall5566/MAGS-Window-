import { NextRequest } from "next/server";
import { proxyMutateToBackend, proxyToBackend } from "@/lib/api/backend-proxy";

export async function GET() {
  return proxyToBackend("/api/powder-coating");
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyMutateToBackend("/api/powder-coating", { method: "POST", body });
}
