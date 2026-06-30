import { proxyMutateToBackend } from "@/lib/api/backend-proxy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyMutateToBackend(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
  });
}
