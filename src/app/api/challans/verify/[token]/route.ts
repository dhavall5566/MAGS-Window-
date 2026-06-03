import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const challan = db.getChallanByToken(token);

  if (!challan) {
    return NextResponse.json({ error: "Invalid verification token" }, { status: 404 });
  }

  return NextResponse.json(challan);
}
