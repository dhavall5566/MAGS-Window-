import { proxyToBackend } from "@/lib/api/backend-proxy";

export async function GET() {
  return proxyToBackend("/api/uploads/auth");
}
