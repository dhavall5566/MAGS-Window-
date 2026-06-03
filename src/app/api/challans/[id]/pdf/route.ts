import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateChallanPdf } from "@/lib/challan-pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const challan = await prisma.challan.findUnique({
    where: { id },
    include: {
      items: { include: { profile: true } },
      vendor: true,
      project: true,
      parentChallan: { select: { challanNumber: true } },
    },
  });

  if (!challan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const baseUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const buffer = await generateChallanPdf(
    {
      ...challan,
      parentChallan: challan.parentChallan,
    },
    baseUrl
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${challan.challanNumber}.pdf"`,
  };

  if (req.nextUrl.searchParams.get("print") === "1") {
    headers["Content-Disposition"] = `inline; filename="${challan.challanNumber}.pdf"`;
  } else {
    headers["Content-Disposition"] = `attachment; filename="${challan.challanNumber}.pdf"`;
  }

  return new NextResponse(new Uint8Array(buffer), { headers });
}
