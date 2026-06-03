import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { ChallanStatus, ChallanType } from "@prisma/client";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const [
    materialSent,
    materialReturned,
    pendingCoating,
    vendorSummary,
  ] = await Promise.all([
    prisma.challan.aggregate({
      where: {
        type: ChallanType.OUTWARD,
        status: { in: [ChallanStatus.ISSUED, ChallanStatus.SENT_FOR_COATING, ChallanStatus.IN_PROCESS] },
      },
      _sum: { totalWeight: true },
    }),
    prisma.challan.aggregate({
      where: { type: ChallanType.RETURN, status: ChallanStatus.COMPLETED },
      _sum: { totalWeight: true },
    }),
    prisma.challan.count({
      where: {
        type: { in: [ChallanType.OUTWARD, ChallanType.POWDER_COATING] },
        status: { in: [ChallanStatus.ISSUED, ChallanStatus.SENT_FOR_COATING, ChallanStatus.IN_PROCESS] },
      },
    }),
    prisma.challan.groupBy({
      by: ["vendorId"],
      where: {
        vendorId: { not: null },
        type: ChallanType.OUTWARD,
      },
      _sum: { totalWeight: true, totalQty: true },
      _count: { id: true },
    }),
  ]);

  const vendors = await prisma.vendor.findMany({
    where: { id: { in: vendorSummary.map((v) => v.vendorId!).filter(Boolean) } },
  });

  const vendorWise = vendorSummary.map((v) => {
    const vendor = vendors.find((x) => x.id === v.vendorId);
    return {
      vendorId: v.vendorId,
      vendorName: vendor?.name ?? "Unknown",
      challanCount: v._count.id,
      totalWeight: v._sum.totalWeight ?? 0,
      totalQty: v._sum.totalQty ?? 0,
    };
  });

  return NextResponse.json({
    materialSentForCoating: materialSent._sum.totalWeight ?? 0,
    materialReturned: materialReturned._sum.totalWeight ?? 0,
    pendingCoating,
    vendorWise,
  });
}
