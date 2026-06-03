import {
  Prisma,
  TransactionType,
  PowderCoatingStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "./prisma";

type Tx = Prisma.TransactionClient;

export async function createLedgerEntry(
  tx: Tx,
  data: {
    profileId: string;
    transactionType: TransactionType;
    quantity: number;
    balance: number;
    userId: string;
    remarks?: string;
    date?: Date;
  }
) {
  return tx.stockLedger.create({
    data: {
      profileId: data.profileId,
      transactionType: data.transactionType,
      quantity: data.quantity,
      balance: data.balance,
      userId: data.userId,
      remarks: data.remarks,
      date: data.date ?? new Date(),
    },
  });
}

export async function logActivity(
  tx: Tx,
  data: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    details?: string;
  }
) {
  return tx.activityLog.create({ data });
}

export async function notifyAdmins(
  tx: Tx,
  title: string,
  message: string,
  type = "alert"
) {
  const admins = await tx.user.findMany({
    where: { role: UserRole.ADMINISTRATOR, status: "ACTIVE" },
  });
  await tx.notification.createMany({
    data: admins.map((u) => ({ userId: u.id, title, message, type })),
  });
}

export async function checkLowStock(
  tx: Tx,
  profileId: string,
  profileCode: string,
  currentStock: number,
  threshold: number
) {
  if (currentStock <= threshold) {
    await notifyAdmins(
      tx,
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
  return prisma.$transaction(async (tx) => {
    const profile = await tx.profile.update({
      where: { id: profileId },
      data: { currentStock: { increment: weight } },
    });

    await createLedgerEntry(tx, {
      profileId,
      transactionType: TransactionType.STOCK_INWARD,
      quantity: weight,
      balance: profile.currentStock,
      userId,
      remarks,
      date,
    });

    await logActivity(tx, {
      userId,
      action: "CREATE",
      entity: "StockInward",
      entityId: profileId,
      details: `Added ${weight} KG to ${profile.profileCode}`,
    });

    await checkLowStock(
      tx,
      profileId,
      profile.profileCode,
      profile.currentStock,
      profile.lowStockThreshold
    );

    return profile;
  });
}

export async function processConsumption(
  profileId: string,
  calculatedWeight: number,
  userId: string,
  remarks?: string,
  date?: Date
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.profile.findUniqueOrThrow({
      where: { id: profileId },
    });

    if (existing.currentStock < calculatedWeight) {
      throw new Error("Insufficient stock for consumption");
    }

    const profile = await tx.profile.update({
      where: { id: profileId },
      data: { currentStock: { decrement: calculatedWeight } },
    });

    await createLedgerEntry(tx, {
      profileId,
      transactionType: TransactionType.MATERIAL_CONSUMPTION,
      quantity: -calculatedWeight,
      balance: profile.currentStock,
      userId,
      remarks,
      date,
    });

    await logActivity(tx, {
      userId,
      action: "CREATE",
      entity: "Consumption",
      entityId: profileId,
      details: `Consumed ${calculatedWeight} KG from ${profile.profileCode}`,
    });

    await checkLowStock(
      tx,
      profileId,
      profile.profileCode,
      profile.currentStock,
      profile.lowStockThreshold
    );

    return profile;
  });
}

export async function processPowderTransfer(
  profileId: string,
  weight: number,
  userId: string,
  remarks?: string
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.profile.findUniqueOrThrow({
      where: { id: profileId },
    });

    if (existing.currentStock < weight) {
      throw new Error("Insufficient raw stock for powder coating transfer");
    }

    const profile = await tx.profile.update({
      where: { id: profileId },
      data: { currentStock: { decrement: weight } },
    });

    await createLedgerEntry(tx, {
      profileId,
      transactionType: TransactionType.POWDER_COATING_TRANSFER,
      quantity: -weight,
      balance: profile.currentStock,
      userId,
      remarks,
    });

    await checkLowStock(
      tx,
      profileId,
      profile.profileCode,
      profile.currentStock,
      profile.lowStockThreshold
    );

    return profile;
  });
}

export async function processPowderReceipt(
  profileId: string,
  weight: number,
  userId: string,
  remarks?: string
) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.profile.update({
      where: { id: profileId },
      data: { powderCoatedStock: { increment: weight } },
    });

    await createLedgerEntry(tx, {
      profileId,
      transactionType: TransactionType.POWDER_COATING_RECEIPT,
      quantity: weight,
      balance: profile.powderCoatedStock,
      userId,
      remarks,
    });

    return profile;
  });
}

export async function processScrap(
  profileId: string,
  quantity: number,
  userId: string,
  remarks?: string,
  date?: Date
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.profile.findUniqueOrThrow({
      where: { id: profileId },
    });

    if (existing.currentStock < quantity) {
      throw new Error("Insufficient stock for scrap entry");
    }

    const profile = await tx.profile.update({
      where: { id: profileId },
      data: { currentStock: { decrement: quantity } },
    });

    await createLedgerEntry(tx, {
      profileId,
      transactionType: TransactionType.SCRAP_ENTRY,
      quantity: -quantity,
      balance: profile.currentStock,
      userId,
      remarks,
      date,
    });

    await logActivity(tx, {
      userId,
      action: "CREATE",
      entity: "ScrapWaste",
      entityId: profileId,
      details: `Scrap ${quantity} KG from ${profile.profileCode}`,
    });

    await checkLowStock(
      tx,
      profileId,
      profile.profileCode,
      profile.currentStock,
      profile.lowStockThreshold
    );

    return profile;
  });
}

export async function completePowderCoating(
  coatingId: string,
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    const coating = await tx.powderCoating.findUniqueOrThrow({
      where: { id: coatingId },
      include: { profile: true },
    });

    if (coating.status === PowderCoatingStatus.COMPLETED) {
      throw new Error("Already completed");
    }

    await tx.powderCoating.update({
      where: { id: coatingId },
      data: { status: PowderCoatingStatus.COMPLETED },
    });

    const profile = await tx.profile.update({
      where: { id: coating.profileId },
      data: { powderCoatedStock: { increment: coating.weight } },
    });

    await createLedgerEntry(tx, {
      profileId: coating.profileId,
      transactionType: TransactionType.POWDER_COATING_RECEIPT,
      quantity: coating.weight,
      balance: profile.powderCoatedStock,
      userId,
      remarks: `Powder coating completed - ${coating.color}`,
    });

    await logActivity(tx, {
      userId,
      action: "UPDATE",
      entity: "PowderCoating",
      entityId: coatingId,
      details: `Completed coating for ${coating.profile.profileCode}`,
    });

    return coating;
  });
}
