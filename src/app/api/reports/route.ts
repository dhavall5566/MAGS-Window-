import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const type = req.nextUrl.searchParams.get("type") ?? "current-stock";
  const profileId = req.nextUrl.searchParams.get("profileId");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const color = req.nextUrl.searchParams.get("color");
  const status = req.nextUrl.searchParams.get("status");

  const dateFilter =
    from || to
      ? {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        }
      : undefined;

  switch (type) {
    case "current-stock": {
      const data = await prisma.profile.findMany({
        where: {
          status: "ACTIVE",
          ...(profileId ? { id: profileId } : {}),
        },
        select: {
          profileCode: true,
          profileName: true,
          seriesName: true,
          currentStock: true,
          powderCoatedStock: true,
          lowStockThreshold: true,
          weightPerMeter: true,
        },
        orderBy: { profileCode: "asc" },
      });
      return NextResponse.json(
        data.map((p) => ({
          Profile: p.profileCode,
          Name: p.profileName,
          Series: p.seriesName,
          "Raw Stock (KG)": p.currentStock,
          "Coated Stock (KG)": p.powderCoatedStock,
          Threshold: p.lowStockThreshold,
          "KG/MTR": p.weightPerMeter,
        }))
      );
    }
    case "consumption": {
      const data = await prisma.consumption.findMany({
        where: {
          ...(profileId ? { profileId } : {}),
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        include: { profile: { select: { profileCode: true, profileName: true } } },
        orderBy: { date: "desc" },
      });
      return NextResponse.json(
        data.map((c) => ({
          Date: c.date,
          Profile: c.profile.profileCode,
          Name: c.profile.profileName,
          Quantity: c.quantity,
          Unit: c.unit,
          "Weight (KG)": c.calculatedWeight,
          Remarks: c.remarks ?? "",
        }))
      );
    }
    case "powder-coating": {
      const data = await prisma.powderCoating.findMany({
        where: {
          ...(profileId ? { profileId } : {}),
          ...(color ? { color: color as never } : {}),
          ...(status ? { status: status as never } : {}),
          ...(dateFilter ? { transferDate: dateFilter } : {}),
        },
        include: { profile: { select: { profileCode: true, profileName: true } } },
        orderBy: { transferDate: "desc" },
      });
      return NextResponse.json(
        data.map((p) => ({
          Date: p.transferDate,
          Profile: p.profile.profileCode,
          Name: p.profile.profileName,
          Quantity: p.quantity,
          "Weight (KG)": p.weight,
          Color: p.color,
          Status: p.status,
          Remarks: p.remarks ?? "",
        }))
      );
    }
    case "color-inventory": {
      const data = await prisma.powderCoating.groupBy({
        by: ["color", "status"],
        _sum: { weight: true, quantity: true },
        where: dateFilter ? { transferDate: dateFilter } : undefined,
      });
      return NextResponse.json(
        data.map((d) => ({
          Color: d.color,
          Status: d.status,
          "Total Weight (KG)": d._sum.weight ?? 0,
          Quantity: d._sum.quantity ?? 0,
        }))
      );
    }
    case "scrap": {
      const data = await prisma.scrapWaste.findMany({
        where: {
          ...(profileId ? { profileId } : {}),
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        include: { profile: { select: { profileCode: true, profileName: true } } },
        orderBy: { date: "desc" },
      });
      return NextResponse.json(
        data.map((s) => ({
          Date: s.date,
          Profile: s.profile.profileCode,
          Name: s.profile.profileName,
          Quantity: s.quantity,
          Reason: s.reason,
          Remarks: s.remarks ?? "",
        }))
      );
    }
    case "stock-movement": {
      const data = await prisma.stockLedger.findMany({
        where: {
          ...(profileId ? { profileId } : {}),
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        include: {
          profile: { select: { profileCode: true } },
          user: { select: { name: true } },
        },
        orderBy: { date: "desc" },
      });
      return NextResponse.json(
        data.map((l) => ({
          Date: l.date,
          Profile: l.profile.profileCode,
          Type: l.transactionType,
          Quantity: l.quantity,
          Balance: l.balance,
          User: l.user.name,
          Remarks: l.remarks ?? "",
        }))
      );
    }
    case "low-stock": {
      const profiles = await prisma.profile.findMany({
        where: { status: "ACTIVE" },
      });
      const low = profiles.filter((p) => p.currentStock <= p.lowStockThreshold);
      return NextResponse.json(
        low.map((p) => ({
          Profile: p.profileCode,
          Name: p.profileName,
          "Current Stock": p.currentStock,
          Threshold: p.lowStockThreshold,
          Deficit: p.lowStockThreshold - p.currentStock,
        }))
      );
    }
    default:
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }
}
