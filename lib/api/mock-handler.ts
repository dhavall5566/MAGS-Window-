import { NextResponse } from "next/server";

/** Always return JSON 200 — never 503 or database errors */
export function mockJson<T extends object>(data: T) {
  return NextResponse.json(data, { status: 200 });
}
