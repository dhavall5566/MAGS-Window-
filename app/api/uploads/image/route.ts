import { NextResponse } from "next/server";

const BACKEND_URL = process.env.MAGS_API_URL ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const response = await fetch(`${BACKEND_URL}/api/uploads/image`, {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("Upload proxy failed:", error);
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
}
