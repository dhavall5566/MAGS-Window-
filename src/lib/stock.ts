import "server-only";
import { mutate, read } from "./store";
import type { TransactionType, UserRole } from "./types";
import { getProfileById } from "./data-access";

function createLedgerEntry(
  data: {
    profileId: string;
    transactionType: TransactionType;
    quantity: number;
    balance: number;
    userId: string;
    remarks?: string;
    date?: string;
  }
) {
  return mutate((d) => {
    const row = {
      id: `sl_${Date.now()}`,
      ...data,
      date: data.date ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    d.stockLedgers.push(row);
    return row;
  });
}

function logActivity(data: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
}) {
  return mutate((d) => {
    const row = {
      id: `al_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
    d.activityLogs.unshift(row);
    return row;
  });
}

function notifyAdmins(title: string, message: string, type = "alert") {
  return mutate((d) => {
    const admins = d.users.filter(
      (u) => u.role === ("ADMINISTRATOR" as UserRole) && u.status === "ACTIVE"
    );
    admins.forEach((u) => {
      d.notifications.unshift({
        id: `n_${Date.now()}_${u.id}`,
        userId: u.id,
        title,
        message,
        read: false,
        type,
        createdAt: new Date().toISOString(),
      });
    });
  });
}

function checkLowStock(
  profileId: string,
  profileCode: string,
  currentStock: number,
  threshold: number
) {
  if (currentStock <= threshold) {
    notifyAdmins(
      "Low Stock Alert",
      `Profile ${profileCode} is low on stock (${currentStock.toFixed(2)} KG remaining).`,
      "warning"
    );
  }
}

export async function processStockInward(
  profileId: string,
  weight: number,
  userId: string,
  remarks?: string,
  date?: Date
) {
  const profile = mutate((d) => {
    const p = getProfileById(d, profileId);
    if (!p) throw new Error("Profile not found");
    p.currentStock += weight;
    p.updatedAt = new Date().toISOString();
    return p;
  });

  createLedgerEntry({
    profileId,
    transactionType: "STOCK_INWARD",
    quantity: weight,
    balance: profile.currentStock,
    userId,
    remarks,
    date: date?.toISOString(),
  });

  logActivity({
    userId,
    action: "CREATE",
    entity: "StockInward",
    entityId: profileId,
    details: `Added ${weight} KG to ${profile.profileCode}`,
  });

  checkLowStock(
    profileId,
    profile.profileCode,
    profile.currentStock,
    profile.lowStockThreshold
  );

  return profile;
}

export async function processConsumption(
  profileId: string,
  calculatedWeight: number,
  userId: string,
  remarks?: string,
  date?: Date
) {
  const profile = mutate((d) => {
    const p = getProfileById(d, profileId);
    if (!p) throw new Error("Profile not found");
    if (p.currentStock < calculatedWeight) {
      throw new Error("Insufficient stock for consumption");
    }
    p.currentStock -= calculatedWeight;
    p.updatedAt = new Date().toISOString();
    return p;
  });

  createLedgerEntry({
    profileId,
    transactionType: "MATERIAL_CONSUMPTION",
    quantity: -calculatedWeight,
    balance: profile.currentStock,
    userId,
    remarks,
    date: date?.toISOString(),
  });

  logActivity({
    userId,
    action: "CREATE",
    entity: "Consumption",
    entityId: profileId,
    details: `Consumed ${calculatedWeight} KG from ${profile.profileCode}`,
  });

  checkLowStock(
    profileId,
    profile.profileCode,
    profile.currentStock,
    profile.lowStockThreshold
  );

  return profile;
}

export async function processPowderTransfer(
  profileId: string,
  weight: number,
  userId: string,
  remarks?: string
) {
  const profile = mutate((d) => {
    const p = getProfileById(d, profileId);
    if (!p) throw new Error("Profile not found");
    if (p.currentStock < weight) {
      throw new Error("Insufficient raw stock for powder coating transfer");
    }
    p.currentStock -= weight;
    p.updatedAt = new Date().toISOString();
    return p;
  });

  createLedgerEntry({
    profileId,
    transactionType: "POWDER_COATING_TRANSFER",
    quantity: -weight,
    balance: profile.currentStock,
    userId,
    remarks,
  });

  checkLowStock(
    profileId,
    profile.profileCode,
    profile.currentStock,
    profile.lowStockThreshold
  );

  return profile;
}

export async function processPowderReceipt(
  profileId: string,
  weight: number,
  userId: string,
  remarks?: string
) {
  const profile = mutate((d) => {
    const p = getProfileById(d, profileId);
    if (!p) throw new Error("Profile not found");
    p.powderCoatedStock += weight;
    p.updatedAt = new Date().toISOString();
    return p;
  });

  createLedgerEntry({
    profileId,
    transactionType: "POWDER_COATING_RECEIPT",
    quantity: weight,
    balance: profile.powderCoatedStock,
    userId,
    remarks,
  });

  return profile;
}

export async function processScrap(
  profileId: string,
  quantity: number,
  userId: string,
  remarks?: string,
  date?: Date
) {
  const profile = mutate((d) => {
    const p = getProfileById(d, profileId);
    if (!p) throw new Error("Profile not found");
    if (p.currentStock < quantity) {
      throw new Error("Insufficient stock for scrap entry");
    }
    p.currentStock -= quantity;
    p.updatedAt = new Date().toISOString();
    return p;
  });

  createLedgerEntry({
    profileId,
    transactionType: "SCRAP_ENTRY",
    quantity: -quantity,
    balance: profile.currentStock,
    userId,
    remarks,
    date: date?.toISOString(),
  });

  logActivity({
    userId,
    action: "CREATE",
    entity: "ScrapWaste",
    entityId: profileId,
    details: `Scrap ${quantity} KG from ${profile.profileCode}`,
  });

  checkLowStock(
    profileId,
    profile.profileCode,
    profile.currentStock,
    profile.lowStockThreshold
  );

  return profile;
}

export async function completePowderCoating(coatingId: string, userId: string) {
  const coating = read((d) => {
    const c = d.powderCoatings.find((x) => x.id === coatingId);
    if (!c) throw new Error("Not found");
    if (c.status === "COMPLETED") throw new Error("Already completed");
    return { ...c, profile: getProfileById(d, c.profileId)! };
  });

  mutate((d) => {
    const c = d.powderCoatings.find((x) => x.id === coatingId)!;
    c.status = "COMPLETED";
    c.updatedAt = new Date().toISOString();
  });

  const profile = mutate((d) => {
    const p = getProfileById(d, coating.profileId)!;
    p.powderCoatedStock += coating.weight;
    p.updatedAt = new Date().toISOString();
    return p;
  });

  createLedgerEntry({
    profileId: coating.profileId,
    transactionType: "POWDER_COATING_RECEIPT",
    quantity: coating.weight,
    balance: profile.powderCoatedStock,
    userId,
    remarks: `Powder coating completed - ${coating.color}`,
  });

  logActivity({
    userId,
    action: "UPDATE",
    entity: "PowderCoating",
    entityId: coatingId,
    details: `Completed coating for ${coating.profile.profileCode}`,
  });

  return coating;
}
