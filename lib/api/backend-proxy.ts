import { NextResponse } from "next/server";

const BACKEND_URL = process.env.MAGS_API_URL ?? "http://127.0.0.1:8000";

type ProxyOptions = {
  searchParams?: URLSearchParams;
};

export async function proxyToBackend(
  path: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const query = options.searchParams?.toString();
  const url = `${BACKEND_URL}${path}${query ? `?${query}` : ""}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.text();

    return new NextResponse(body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error(`Backend proxy failed for ${path}:`, error);
    return NextResponse.json(
      { error: "Backend unavailable", path },
      { status: 503 }
    );
  }
}
