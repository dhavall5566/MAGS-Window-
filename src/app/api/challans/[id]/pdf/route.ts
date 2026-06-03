import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/data-access";
import { generateChallanPdf } from "@/lib/challan-pdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const challan = db.getChallan(id);

  if (!challan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const buffer = await generateChallanPdf(
    {
      ...challan,
      parentChallan: challan.parentChallan
        ? { challanNumber: challan.parentChallan.challanNumber }
        : null,
    },
    baseUrl
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/pdf",
  };

  if (req.nextUrl.searchParams.get("print") === "1") {
    headers["Content-Disposition"] = `inline; filename="${challan.challanNumber}.pdf"`;
  } else {
    headers["Content-Disposition"] = `attachment; filename="${challan.challanNumber}.pdf"`;
  }

  return new NextResponse(new Uint8Array(buffer), { headers });
}
