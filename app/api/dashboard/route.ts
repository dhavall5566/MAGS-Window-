import { proxyToBackend } from "@/lib/api/backend-proxy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return proxyToBackend("/api/dashboard", { searchParams });
}
