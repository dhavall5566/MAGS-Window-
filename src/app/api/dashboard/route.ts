import { NextResponse } from "next/server";
import { db } from "@/lib/data-access";

/** Dashboard metrics from in-memory mock data (no database). */
export async function GET() {
  return NextResponse.json(db.getDashboard());
}
