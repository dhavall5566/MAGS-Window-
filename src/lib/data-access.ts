import "server-only";
import { read, mutate, generateId, now } from "./store";
import type {
  Database,
  Profile,
  User,
  Challan,
  ChallanItem,
  Vendor,
  Project,
  StockLedger,
  ChallanType,
  ChallanStatus,
  TransactionType,
} from "./types";

export function getProfileById(db: Database, id: string) {
  return db.profiles.find((p) => p.id === id);
}

export function withProfile<T extends { profileId: string }>(
  db: Database,
  row: T
) {
  const profile = getProfileById(db, row.profileId);
  return { ...row, profile: profile! };
}

export function enrichChallan(db: Database, c: Challan) {
  return {
    ...c,
    vendor: c.vendorId ? db.vendors.find((v) => v.id === c.vendorId) ?? null : null,
    project: c.projectId
      ? db.projects.find((p) => p.id === c.projectId) ?? null
      : null,
    parentChallan: c.parentChallanId
      ? db.challans.find((x) => x.id === c.parentChallanId) ?? null
      : null,
    childChallans: db.challans
      .filter((x) => x.parentChallanId === c.id)
      .map((x) => ({ id: x.id, challanNumber: x.challanNumber, type: x.type, status: x.status })),
    items: db.challanItems
      .filter((i) => i.challanId === c.id)
      .map((i) => ({ ...i, profile: getProfileById(db, i.profileId)! })),
  };
}

export const db = {
  getUsers: () => read((d) => d.users),
  getUserById: (id: string) => read((d) => d.users.find((u) => u.id === id)),
  getActiveUser: () =>
    read((d) => d.users.find((u) => u.status === "ACTIVE") ?? d.users[0]),

  getProfiles: (filter?: { search?: string; series?: string; status?: string }) =>
    read((d) => {
      let list = [...d.profiles];
      if (filter?.search) {
        const s = filter.search.toLowerCase();
        list = list.filter(
          (p) =>
            p.profileCode.toLowerCase().includes(s) ||
            p.profileName.toLowerCase().includes(s) ||
            p.seriesName.toLowerCase().includes(s)
        );
      }
      if (filter?.series) list = list.filter((p) => p.seriesName === filter.series);
      if (filter?.status) list = list.filter((p) => p.status === filter.status);
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),

  getProfile: (id: string) =>
    read((d) => {
      const p = getProfileById(d, id);
      if (!p) return null;
      return {
        ...p,
        stockInwards: d.stockInwards
          .filter((s) => s.profileId === id)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 10),
        consumptions: d.consumptions
          .filter((c) => c.profileId === id)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 10),
        powderCoatings: d.powderCoatings
          .filter((c) => c.profileId === id)
          .sort((a, b) => b.transferDate.localeCompare(a.transferDate))
          .slice(0, 10),
        stockLedgers: d.stockLedgers
          .filter((l) => l.profileId === id)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 15)
          .map((l) => ({
            ...l,
            user: d.users.find((u) => u.id === l.userId)!,
          })),
      };
    }),

  createProfile: (data: Omit<Profile, "id" | "createdAt" | "updatedAt" | "powderCoatedStock" | "currentStock"> & { currentStock?: number }) =>
    mutate((d) => {
      if (d.profiles.some((p) => p.profileCode === data.profileCode)) {
        throw new Error("Profile code already exists");
      }
      const p: Profile = {
        ...data,
        id: generateId(),
        currentStock: data.currentStock ?? 0,
        powderCoatedStock: 0,
        createdAt: now(),
        updatedAt: now(),
      };
      d.profiles.push(p);
      return p;
    }),

  updateProfile: (id: string, data: Partial<Profile>) =>
    mutate((d) => {
      const i = d.profiles.findIndex((p) => p.id === id);
      if (i < 0) throw new Error("Not found");
      d.profiles[i] = { ...d.profiles[i], ...data, updatedAt: now() };
      return d.profiles[i];
    }),

  getVendors: () => read((d) => d.vendors.filter((v) => v.status === "ACTIVE")),
  createVendor: (data: Omit<Vendor, "id" | "createdAt" | "updatedAt">) =>
    mutate((d) => {
      const v: Vendor = { ...data, id: generateId(), createdAt: now(), updatedAt: now() };
      d.vendors.push(v);
      return v;
    }),

  getProjects: () =>
    read((d) =>
      d.projects.map((p) => ({
        ...p,
        profiles: d.projectProfiles
          .filter((pp) => pp.projectId === p.id)
          .map((pp) => ({ ...pp, profile: getProfileById(d, pp.profileId)! })),
        _count: { challans: d.challans.filter((c) => c.projectId === p.id).length },
      }))
    ),

  getProject: (id: string) =>
    read((d) => {
      const p = d.projects.find((x) => x.id === id);
      if (!p) return null;
      return {
        ...p,
        profiles: d.projectProfiles
          .filter((pp) => pp.projectId === id)
          .map((pp) => ({ ...pp, profile: getProfileById(d, pp.profileId)! })),
        challans: d.challans.filter((c) => c.projectId === id).map((c) => enrichChallan(d, c)),
      };
    }),

  createProject: (
    data: Omit<Project, "id" | "createdAt" | "updatedAt">,
    profiles?: { profileId: string; plannedQty: number; plannedLength?: number }[]
  ) =>
    mutate((d) => {
      const p: Project = { ...data, id: generateId(), createdAt: now(), updatedAt: now() };
      d.projects.push(p);
      profiles?.forEach((pp) => {
        d.projectProfiles.push({
          id: generateId(),
          projectId: p.id,
          profileId: pp.profileId,
          plannedQty: pp.plannedQty,
          plannedLength: pp.plannedLength,
        });
      });
      return {
        ...p,
        profiles: d.projectProfiles
          .filter((x) => x.projectId === p.id)
          .map((x) => ({ ...x, profile: getProfileById(d, x.profileId)! })),
      };
    }),

  getChallans: (filter?: {
    type?: ChallanType;
    status?: ChallanStatus;
    vendorId?: string;
    projectId?: string;
  }) =>
    read((d) => {
      let list = d.challans;
      if (filter?.type) list = list.filter((c) => c.type === filter.type);
      if (filter?.status) list = list.filter((c) => c.status === filter.status);
      if (filter?.vendorId) list = list.filter((c) => c.vendorId === filter.vendorId);
      if (filter?.projectId) list = list.filter((c) => c.projectId === filter.projectId);
      return list
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((c) => enrichChallan(d, c));
    }),

  getChallan: (id: string) =>
    read((d) => {
      const c = d.challans.find((x) => x.id === id);
      return c ? enrichChallan(d, c) : null;
    }),

  getChallanByToken: (token: string) =>
    read((d) => {
      const c = d.challans.find((x) => x.verifiedToken === token);
      return c ? enrichChallan(d, c) : null;
    }),

  countChallans: (prefix: string) =>
    read((d) => d.challans.filter((c) => c.challanNumber.startsWith(prefix)).length),

  createChallan: (
    challan: Omit<Challan, "id" | "createdAt" | "updatedAt" | "verifiedToken">,
    items: Omit<ChallanItem, "id" | "challanId">[]
  ) =>
    mutate((d) => {
      const c: Challan = {
        ...challan,
        id: generateId(),
        verifiedToken: generateId(),
        createdAt: now(),
        updatedAt: now(),
      };
      d.challans.push(c);
      items.forEach((item) => {
        d.challanItems.push({ ...item, id: generateId(), challanId: c.id });
      });
      return enrichChallan(d, c);
    }),

  updateChallan: (id: string, data: Partial<Challan>) =>
    mutate((d) => {
      const i = d.challans.findIndex((c) => c.id === id);
      if (i < 0) throw new Error("Not found");
      d.challans[i] = { ...d.challans[i], ...data, updatedAt: now() };
      return enrichChallan(d, d.challans[i]);
    }),

  deleteChallan: (id: string) =>
    mutate((d) => {
      d.challanItems = d.challanItems.filter((i) => i.challanId !== id);
      d.challans = d.challans.filter((c) => c.id !== id);
    }),

  getSeriesList: () =>
    read((d) => [...new Set(d.profiles.map((p) => p.seriesName))]),

  getStockInwards: () =>
    read((d) =>
      d.stockInwards
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((s) => withProfile(d, s))
    ),

  createStockInward: (data: Omit<import("./types").StockInward, "id" | "createdAt">) =>
    mutate((d) => {
      const row = { ...data, id: generateId(), createdAt: now() };
      d.stockInwards.push(row);
      return { ...row, profile: getProfileById(d, row.profileId)! };
    }),

  getConsumptions: () =>
    read((d) =>
      d.consumptions
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((c) => withProfile(d, c))
    ),

  createConsumption: (data: Omit<import("./types").Consumption, "id" | "createdAt">) =>
    mutate((d) => {
      const row = { ...data, id: generateId(), createdAt: now() };
      d.consumptions.push(row);
      return { ...row, profile: getProfileById(d, row.profileId)! };
    }),

  getPowderCoatings: (filter?: { color?: string; status?: string }) =>
    read((d) => {
      let list = d.powderCoatings;
      if (filter?.color) list = list.filter((c) => c.color === filter.color);
      if (filter?.status) list = list.filter((c) => c.status === filter.status);
      return list
        .sort((a, b) => b.transferDate.localeCompare(a.transferDate))
        .map((c) => withProfile(d, c));
    }),

  createPowderCoating: (data: Omit<import("./types").PowderCoating, "id" | "createdAt" | "updatedAt">) =>
    mutate((d) => {
      const row = { ...data, id: generateId(), createdAt: now(), updatedAt: now() };
      d.powderCoatings.push(row);
      return { ...row, profile: getProfileById(d, row.profileId)! };
    }),

  updatePowderCoating: (id: string, data: Partial<import("./types").PowderCoating>) =>
    mutate((d) => {
      const i = d.powderCoatings.findIndex((c) => c.id === id);
      if (i < 0) throw new Error("Not found");
      d.powderCoatings[i] = { ...d.powderCoatings[i], ...data, updatedAt: now() };
      return { ...d.powderCoatings[i], profile: getProfileById(d, d.powderCoatings[i].profileId)! };
    }),

  getScrapWastes: () =>
    read((d) =>
      d.scrapWastes
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((s) => withProfile(d, s))
    ),

  createScrapWaste: (data: Omit<import("./types").ScrapWaste, "id" | "createdAt">) =>
    mutate((d) => {
      const row = { ...data, id: generateId(), createdAt: now() };
      d.scrapWastes.push(row);
      return { ...row, profile: getProfileById(d, row.profileId)! };
    }),

  getStockLedgers: (filter?: {
    profileId?: string;
    type?: TransactionType;
    userId?: string;
    from?: string;
    to?: string;
  }) =>
    read((d) => {
      let list = d.stockLedgers;
      if (filter?.profileId) list = list.filter((l) => l.profileId === filter.profileId);
      if (filter?.type) list = list.filter((l) => l.transactionType === filter.type);
      if (filter?.userId) list = list.filter((l) => l.userId === filter.userId);
      if (filter?.from) list = list.filter((l) => l.date >= filter.from!);
      if (filter?.to) list = list.filter((l) => l.date <= filter.to!);
      return list
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((l) => ({
          ...l,
          profile: getProfileById(d, l.profileId)!,
          user: d.users.find((u) => u.id === l.userId)!,
        }));
    }),

  createStockLedger: (data: Omit<StockLedger, "id" | "createdAt">) =>
    mutate((d) => {
      const row = { ...data, id: generateId(), createdAt: now() };
      d.stockLedgers.push(row);
      return row;
    }),

  updateProfileStock: (
    profileId: string,
    update: { currentStock?: { increment?: number; decrement?: number }; powderCoatedStock?: { increment?: number } }
  ) =>
    mutate((d) => {
      const p = getProfileById(d, profileId);
      if (!p) throw new Error("Profile not found");
      if (update.currentStock?.increment) p.currentStock += update.currentStock.increment;
      if (update.currentStock?.decrement) p.currentStock -= update.currentStock.decrement;
      if (update.powderCoatedStock?.increment) p.powderCoatedStock += update.powderCoatedStock.increment;
      p.updatedAt = now();
      return p;
    }),

  getActivityLogs: (limit = 50) =>
    read((d) =>
      d.activityLogs
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map((l) => ({ ...l, user: d.users.find((u) => u.id === l.userId)! }))
    ),

  createActivityLog: (data: Omit<import("./types").ActivityLog, "id" | "createdAt">) =>
    mutate((d) => {
      const row = { ...data, id: generateId(), createdAt: now() };
      d.activityLogs.unshift(row);
      return row;
    }),

  getNotifications: (userId?: string) =>
    read((d) => {
      let list = d.notifications;
      if (userId) list = list.filter((n) => n.userId === userId);
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);
    }),

  createUser: (data: Omit<User, "id" | "createdAt" | "updatedAt">) =>
    mutate((d) => {
      if (d.users.some((u) => u.email === data.email)) throw new Error("Email exists");
      const u: User = { ...data, id: generateId(), createdAt: now(), updatedAt: now() };
      d.users.push(u);
      return u;
    }),

  updateUser: (id: string, data: Partial<User>) =>
    mutate((d) => {
      const i = d.users.findIndex((u) => u.id === id);
      if (i < 0) throw new Error("Not found");
      d.users[i] = { ...d.users[i], ...data, updatedAt: now() };
      return d.users[i];
    }),

  getDashboard: () =>
    read((d) => {
      const profiles = d.profiles.filter((p) => p.status === "ACTIVE");
      const totalConsumption = d.consumptions.reduce((s, c) => s + c.calculatedWeight, 0);
      const pendingCoating = d.powderCoatings.filter(
        (c) => c.status !== "COMPLETED"
      ).length;
      const completedCoating = d.powderCoatings.filter(
        (c) => c.status === "COMPLETED"
      ).length;
      const scrapQuantity = d.scrapWastes.reduce((s, c) => s + c.quantity, 0);

      const monthLabels: string[] = [];
      const consumptionTrend: { month: string; weight: number }[] = [];
      const stockMovement: { month: string; inward: number; outward: number }[] = [];

      for (let i = 5; i >= 0; i--) {
        const d0 = new Date();
        d0.setMonth(d0.getMonth() - i);
        const label = d0.toLocaleString("en", { month: "short", year: "numeric" });
        monthLabels.push(label);
        const monthConsumptions = d.consumptions.filter(
          (c) => new Date(c.date).toLocaleString("en", { month: "short", year: "numeric" }) === label
        );
        consumptionTrend.push({
          month: label,
          weight: monthConsumptions.reduce((s, c) => s + c.calculatedWeight, 0),
        });
        const monthInward = d.stockInwards
          .filter(
            (x) =>
              new Date(x.date).toLocaleString("en", { month: "short", year: "numeric" }) === label
          )
          .reduce((s, x) => s + x.weight, 0);
        stockMovement.push({
          month: label,
          inward: monthInward,
          outward: monthConsumptions.reduce((s, c) => s + c.calculatedWeight, 0),
        });
      }

      const colorGroups: Record<string, number> = {};
      d.powderCoatings.forEach((c) => {
        const k = c.color.replace(/_/g, " ");
        colorGroups[k] = (colorGroups[k] ?? 0) + c.weight;
      });

      return {
        stats: {
          totalProfiles: profiles.length,
          availableStock: profiles.reduce((s, p) => s + p.currentStock, 0),
          lowStockCount: profiles.filter((p) => p.currentStock <= p.lowStockThreshold).length,
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
        recentTransactions: d.stockLedgers
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 10)
          .map((l) => ({
            ...l,
            profile: {
              profileCode: getProfileById(d, l.profileId)!.profileCode,
              profileName: getProfileById(d, l.profileId)!.profileName,
            },
            user: { name: d.users.find((u) => u.id === l.userId)?.name ?? "System" },
          })),
        charts: {
          inventoryOverview: profiles
            .sort((a, b) => a.currentStock - b.currentStock)
            .slice(0, 8)
            .map((p) => ({ name: p.profileCode, stock: Math.round(p.currentStock * 100) / 100 })),
          consumptionTrend,
          colorWiseCoating: Object.entries(colorGroups).map(([color, weight]) => ({
            color,
            weight,
          })),
          stockMovement,
        },
      };
    }),

  getChallanMetrics: () =>
    read((d) => {
      const sentStatuses: ChallanStatus[] = ["ISSUED", "SENT_FOR_COATING", "IN_PROCESS"];
      const materialSent = d.challans
        .filter((c) => c.type === "OUTWARD" && sentStatuses.includes(c.status))
        .reduce((s, c) => s + c.totalWeight, 0);
      const materialReturned = d.challans
        .filter((c) => c.type === "RETURN" && c.status === "COMPLETED")
        .reduce((s, c) => s + c.totalWeight, 0);
      const pendingCoating = d.challans.filter(
        (c) =>
          (c.type === "OUTWARD" || c.type === "POWDER_COATING") &&
          sentStatuses.includes(c.status)
      ).length;

      const vendorMap: Record<string, { vendorName: string; challanCount: number; totalWeight: number; totalQty: number }> = {};
      d.challans
        .filter((c) => c.type === "OUTWARD" && c.vendorId)
        .forEach((c) => {
          const v = d.vendors.find((x) => x.id === c.vendorId);
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
    }),
};
