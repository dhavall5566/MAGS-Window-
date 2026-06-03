import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";
import type { TransactionType } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const profileId = req.nextUrl.searchParams.get("profileId") ?? undefined;
  const type = req.nextUrl.searchParams.get("type") as TransactionType | null;
  const from = req.nextUrl.searchParams.get("from") ?? undefined;
  const to = req.nextUrl.searchParams.get("to") ?? undefined;
  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;

  return NextResponse.json(
    db.getStockLedgers({
      profileId,
      type: type ?? undefined,
      userId,
      from,
      to,
    })
  );
}
