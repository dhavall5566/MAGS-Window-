import { NextRequest } from "next/server";
import { proxyMutateToBackend } from "@/lib/api/backend-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.text();
  return proxyMutateToBackend(`/api/purchase-orders/${encodeURIComponent(id)}`, {
    method: "PUT",
    body,
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyMutateToBackend(`/api/purchase-orders/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
