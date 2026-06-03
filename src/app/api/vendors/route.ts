import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";
import { vendorSchema } from "@/lib/validations";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  return NextResponse.json(db.getVendors());
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = vendorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const vendor = db.createVendor(parsed.data);
  return NextResponse.json(vendor, { status: 201 });
}
