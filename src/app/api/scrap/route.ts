import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";
import { scrapSchema } from "@/lib/validations";
import { processScrap } from "@/lib/stock";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  return NextResponse.json(db.getScrapWastes());
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = scrapSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const date = parsed.data.date ? new Date(parsed.data.date) : new Date();

  try {
    await processScrap(
      parsed.data.profileId,
      parsed.data.quantity,
      user.id,
      parsed.data.remarks,
      date
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Stock error" },
      { status: 400 }
    );
  }

  const entry = db.createScrapWaste({
    profileId: parsed.data.profileId,
    quantity: parsed.data.quantity,
    reason: parsed.data.reason,
    remarks: parsed.data.remarks,
    date: date.toISOString(),
  });

  return NextResponse.json(entry, { status: 201 });
}
