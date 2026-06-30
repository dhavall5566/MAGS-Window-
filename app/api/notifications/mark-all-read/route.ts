import { proxyMutateToBackend } from "@/lib/api/backend-proxy";

export async function POST() {
  return proxyMutateToBackend("/api/notifications/mark-all-read", { method: "POST" });
}
