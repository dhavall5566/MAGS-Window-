import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { TransactionType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const profileId = req.nextUrl.searchParams.get("profileId");
  const type = req.nextUrl.searchParams.get("type");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const userId = req.nextUrl.searchParams.get("userId");

  const entries = await prisma.stockLedger.findMany({
    where: {
      ...(profileId ? { profileId } : {}),
      ...(type ? { transactionType: type as TransactionType } : {}),
      ...(userId ? { userId } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "desc" },
    include: {
      profile: { select: { profileCode: true, profileName: true } },
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(entries);
}
