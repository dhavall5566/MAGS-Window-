import { NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  return NextResponse.json(db.getActivityLogs());
}
