import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const challan = await prisma.challan.findUnique({
    where: { verifiedToken: token },
    include: {
      items: { include: { profile: true } },
      vendor: true,
      project: true,
      parentChallan: { select: { challanNumber: true, type: true } },
    },
  });

  if (!challan) {
    return NextResponse.json({ error: "Invalid verification token" }, { status: 404 });
  }

  return NextResponse.json(challan);
}
