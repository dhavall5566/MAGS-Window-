import { NextRequest } from "next/server";
import { proxyMutateToBackend } from "@/lib/api/backend-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.text();
  return proxyMutateToBackend(`/api/stock-inward/${encodeURIComponent(id)}/split`, {
    method: "POST",
    body,
  });
}
