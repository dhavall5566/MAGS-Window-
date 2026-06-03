import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { PowderCoatingStatus } from "@prisma/client";
import { format, subMonths, startOfMonth } from "date-fns";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const [
    totalProfiles,
    profiles,
    totalConsumption,
    pendingCoating,
    completedCoating,
    scrapAgg,
    recentLedger,
    consumptions,
    coatings,
    inwardByMonth,
  ] = await Promise.all([
    prisma.profile.count({ where: { status: "ACTIVE" } }),
    prisma.profile.findMany({
      where: { status: "ACTIVE" },
      select: { currentStock: true, lowStockThreshold: true, profileCode: true, profileName: true },
    }),
    prisma.consumption.aggregate({ _sum: { calculatedWeight: true } }),
    prisma.powderCoating.count({ where: { status: { not: PowderCoatingStatus.COMPLETED } } }),
    prisma.powderCoating.count({ where: { status: PowderCoatingStatus.COMPLETED } }),
    prisma.scrapWaste.aggregate({ _sum: { quantity: true } }),
    prisma.stockLedger.findMany({
      take: 10,
      orderBy: { date: "desc" },
      include: {
        profile: { select: { profileCode: true, profileName: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.consumption.findMany({
      where: { date: { gte: subMonths(new Date(), 6) } },
      select: { calculatedWeight: true, date: true },
    }),
    prisma.powderCoating.groupBy({
      by: ["color"],
      _sum: { weight: true },
    }),
    prisma.stockInward.findMany({
      where: { date: { gte: subMonths(new Date(), 6) } },
      select: { weight: true, date: true },
    }),
  ]);

  const availableStock = profiles.reduce((s, p) => s + p.currentStock, 0);
  const lowStockProfiles = profiles.filter(
    (p) => p.currentStock <= p.lowStockThreshold
  );

  const monthLabels: string[] = [];
  const consumptionTrend: { month: string; weight: number }[] = [];
  const stockMovement: { month: string; inward: number; outward: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = startOfMonth(subMonths(new Date(), i));
    const label = format(d, "MMM yyyy");
    monthLabels.push(label);

    const monthConsumptions = consumptions.filter(
      (c) => format(new Date(c.date), "MMM yyyy") === label
    );
    consumptionTrend.push({
      month: label,
      weight: monthConsumptions.reduce((s, c) => s + c.calculatedWeight, 0),
    });

    const monthInward = inwardByMonth
      .filter((x) => format(new Date(x.date), "MMM yyyy") === label)
      .reduce((s, x) => s + x.weight, 0);

    stockMovement.push({
      month: label,
      inward: monthInward,
      outward: monthConsumptions.reduce((s, c) => s + c.calculatedWeight, 0),
    });
  }

  const inventoryOverview = profiles
    .sort((a, b) => a.currentStock - b.currentStock)
    .slice(0, 8)
    .map((p) => ({
      name: p.profileCode,
      stock: Math.round(p.currentStock * 100) / 100,
    }));

  return NextResponse.json({
    stats: {
      totalProfiles,
      availableStock: Math.round(availableStock * 100) / 100,
      lowStockCount: lowStockProfiles.length,
      totalConsumption: totalConsumption._sum.calculatedWeight ?? 0,
      pendingCoating,
      completedCoating,
      scrapQuantity: scrapAgg._sum.quantity ?? 0,
    },
    lowStockProfiles: lowStockProfiles.slice(0, 5),
    recentTransactions: recentLedger,
    charts: {
      inventoryOverview,
      consumptionTrend,
      colorWiseCoating: coatings.map((c) => ({
        color: c.color.replace(/_/g, " "),
        weight: c._sum.weight ?? 0,
      })),
      stockMovement,
    },
  });
}
