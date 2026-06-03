/**
 * Client-side fallback data when APIs fail (503, offline, old deploys).
 * Safe to import in "use client" components — no fs or Prisma.
 */
import { initialMockDatabase } from "./mock-data";

const db = initialMockDatabase;

function buildDashboard() {
  const profiles = db.profiles.filter((p) => p.status === "ACTIVE");
  const totalConsumption = db.consumptions.reduce(
    (s, c) => s + c.calculatedWeight,
    0
  );
  const pendingCoating = db.powderCoatings.filter(
    (c) => c.status !== "COMPLETED"
  ).length;
  const completedCoating = db.powderCoatings.filter(
    (c) => c.status === "COMPLETED"
  ).length;
  const scrapQuantity = db.scrapWastes.reduce((s, c) => s + c.quantity, 0);

  const consumptionTrend: { month: string; weight: number }[] = [];
  const stockMovement: { month: string; inward: number; outward: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d0 = new Date();
    d0.setMonth(d0.getMonth() - i);
    const label = d0.toLocaleString("en", { month: "short", year: "numeric" });
    const monthConsumptions = db.consumptions.filter(
      (c) =>
        new Date(c.date).toLocaleString("en", {
          month: "short",
          year: "numeric",
        }) === label
    );
    consumptionTrend.push({
      month: label,
      weight: monthConsumptions.reduce((s, c) => s + c.calculatedWeight, 0),
    });
    const monthInward = db.stockInwards
      .filter(
        (x) =>
          new Date(x.date).toLocaleString("en", {
            month: "short",
            year: "numeric",
          }) === label
      )
      .reduce((s, x) => s + x.weight, 0);
    stockMovement.push({
      month: label,
      inward: monthInward,
      outward: monthConsumptions.reduce((s, c) => s + c.calculatedWeight, 0),
    });
  }

  const colorGroups: Record<string, number> = {};
  db.powderCoatings.forEach((c) => {
    const k = c.color.replace(/_/g, " ");
    colorGroups[k] = (colorGroups[k] ?? 0) + c.weight;
  });

  return {
    stats: {
      totalProfiles: profiles.length,
      availableStock: profiles.reduce((s, p) => s + p.currentStock, 0),
      lowStockCount: profiles.filter(
        (p) => p.currentStock <= p.lowStockThreshold
      ).length,
      totalConsumption,
      pendingCoating,
      completedCoating,
      scrapQuantity,
    },
    lowStockProfiles: profiles
      .filter((p) => p.currentStock <= p.lowStockThreshold)
      .slice(0, 5)
      .map((p) => ({
        profileCode: p.profileCode,
        profileName: p.profileName,
        currentStock: p.currentStock,
        lowStockThreshold: p.lowStockThreshold,
      })),
    recentTransactions: db.stockLedgers
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10)
      .map((l) => {
        const prof = db.profiles.find((p) => p.id === l.profileId);
        const user = db.users.find((u) => u.id === l.userId);
        return {
          ...l,
          profile: {
            profileCode: prof?.profileCode ?? "—",
            profileName: prof?.profileName ?? "—",
          },
          user: { name: user?.name ?? "System" },
        };
      }),
    charts: {
      inventoryOverview: profiles
        .sort((a, b) => a.currentStock - b.currentStock)
        .slice(0, 8)
        .map((p) => ({
          name: p.profileCode,
          stock: Math.round(p.currentStock * 100) / 100,
        })),
      consumptionTrend,
      colorWiseCoating: Object.entries(colorGroups).map(([color, weight]) => ({
        color,
        weight,
      })),
      stockMovement,
    },
  };
}

function buildChallanMetrics() {
  const sentStatuses = new Set(["ISSUED", "SENT_FOR_COATING", "IN_PROCESS"]);
  const materialSent = db.challans
    .filter((c) => c.type === "OUTWARD" && sentStatuses.has(c.status))
    .reduce((s, c) => s + c.totalWeight, 0);
  const materialReturned = db.challans
    .filter((c) => c.type === "RETURN" && c.status === "COMPLETED")
    .reduce((s, c) => s + c.totalWeight, 0);
  const pendingCoating = db.challans.filter(
    (c) =>
      (c.type === "OUTWARD" || c.type === "POWDER_COATING") &&
      sentStatuses.has(c.status)
  ).length;

  const vendorMap: Record<
    string,
    { vendorName: string; challanCount: number; totalWeight: number; totalQty: number }
  > = {};
  db.challans
    .filter((c) => c.type === "OUTWARD" && c.vendorId)
    .forEach((c) => {
      const v = db.vendors.find((x) => x.id === c.vendorId);
      const key = c.vendorId!;
      if (!vendorMap[key]) {
        vendorMap[key] = {
          vendorName: v?.name ?? "Unknown",
          challanCount: 0,
          totalWeight: 0,
          totalQty: 0,
        };
      }
      vendorMap[key].challanCount++;
      vendorMap[key].totalWeight += c.totalWeight;
      vendorMap[key].totalQty += c.totalQty;
    });

  return {
    materialSentForCoating: materialSent,
    materialReturned,
    pendingCoating,
    vendorWise: Object.values(vendorMap),
  };
}

function enrichChallan(c: (typeof db.challans)[0]) {
  return {
    ...c,
    vendor: c.vendorId
      ? db.vendors.find((v) => v.id === c.vendorId) ?? null
      : null,
    project: c.projectId
      ? db.projects.find((p) => p.id === c.projectId) ?? null
      : null,
    parentChallan: c.parentChallanId
      ? db.challans.find((x) => x.id === c.parentChallanId) ?? null
      : null,
    items: db.challanItems
      .filter((i) => i.challanId === c.id)
      .map((i) => ({
        ...i,
        profile: db.profiles.find((p) => p.id === i.profileId)!,
      })),
  };
}

export const fallbackDashboard = buildDashboard();

export const fallbackChallanMetrics = buildChallanMetrics();

export const fallbackProfilesResponse = {
  profiles: db.profiles,
  seriesList: [...new Set(db.profiles.map((p) => p.seriesName))],
};

export const fallbackProfiles = db.profiles;

export const fallbackGalleryProfiles = db.profiles
  .filter((p) => p.status === "ACTIVE")
  .map((p) => ({
    id: p.id,
    profileCode: p.profileCode,
    profileName: p.profileName,
    seriesName: p.seriesName,
    weightPerMeter: p.weightPerMeter,
    imageUrl: p.imageUrl ?? null,
    currentStock: p.currentStock,
    powderCoatedStock: p.powderCoatedStock,
  }));

export const fallbackChallans = db.challans.map((c) => enrichChallan(c));

export const fallbackChallanDetail = enrichChallan(db.challans[0]);

export function fallbackChallanById(id: string) {
  const found = fallbackChallans.find((c) => c.id === id);
  return found ?? { ...fallbackChallanDetail, id };
}

export const fallbackOutwardChallans = fallbackChallans.filter(
  (c) => c.type === "OUTWARD"
);

export const fallbackVendors = db.vendors.filter((v) => v.status === "ACTIVE");

export const fallbackProjects = db.projects.map((p) => ({
  ...p,
  profiles: db.projectProfiles
    .filter((pp) => pp.projectId === p.id)
    .map((pp) => ({ ...pp, profile: db.profiles.find((x) => x.id === pp.profileId)! })),
  _count: { challans: db.challans.filter((c) => c.projectId === p.id).length },
}));

export const fallbackUsers = db.users;

export const fallbackNotifications = db.notifications;

export const fallbackActivityLogs = db.activityLogs.map((l) => ({
  ...l,
  user: db.users.find((u) => u.id === l.userId) ?? { name: "System" },
}));

export const fallbackStockInwards = db.stockInwards.map((s) => ({
  ...s,
  profile: db.profiles.find((p) => p.id === s.profileId)!,
}));

export const fallbackConsumptions = db.consumptions.map((c) => ({
  ...c,
  profile: db.profiles.find((p) => p.id === c.profileId)!,
}));

export const fallbackPowderCoatings = db.powderCoatings.map((c) => ({
  ...c,
  profile: db.profiles.find((p) => p.id === c.profileId)!,
}));

export const fallbackScrapWastes = db.scrapWastes.map((s) => ({
  ...s,
  profile: db.profiles.find((p) => p.id === s.profileId)!,
}));

export const fallbackStockLedgers = db.stockLedgers.map((l) => ({
  ...l,
  profile: db.profiles.find((p) => p.id === l.profileId)!,
  user: db.users.find((u) => u.id === l.userId)!,
}));

export const fallbackReportCurrentStock = db.profiles
  .filter((p) => p.status === "ACTIVE")
  .map((p) => ({
    Profile: p.profileCode,
    Name: p.profileName,
    Series: p.seriesName,
    "Raw Stock (KG)": p.currentStock,
    "Coated Stock (KG)": p.powderCoatedStock,
    Threshold: p.lowStockThreshold,
    "KG/MTR": p.weightPerMeter,
  }));

export const fallbackInventory = fallbackReportCurrentStock;

export function fallbackProfileDetail(id: string) {
  const p = db.profiles.find((x) => x.id === id) ?? db.profiles[0];
  return {
    ...p,
    stockInwards: db.stockInwards
      .filter((s) => s.profileId === p.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10),
    consumptions: db.consumptions
      .filter((c) => c.profileId === p.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10),
    powderCoatings: db.powderCoatings
      .filter((c) => c.profileId === p.id)
      .sort((a, b) => b.transferDate.localeCompare(a.transferDate))
      .slice(0, 10),
    stockLedgers: db.stockLedgers
      .filter((l) => l.profileId === p.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 15)
      .map((l) => ({
        ...l,
        user: db.users.find((u) => u.id === l.userId) ?? { name: "System" },
      })),
  };
}
