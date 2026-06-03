import {
  ChallanStatus,
  ChallanType,
  PowderCoatingColor,
  Prisma,
  TransactionType,
} from "@prisma/client";
import { prisma } from "./prisma";
import { createLedgerEntry, logActivity, checkLowStock } from "./stock";

const PREFIX: Record<ChallanType, string> = {
  OUTWARD: "OUT",
  POWDER_COATING: "PC",
  RETURN: "RET",
};

export async function generateChallanNumber(type: ChallanType) {
  const year = new Date().getFullYear();
  const prefix = `MAGS/${PREFIX[type]}/${year}/`;
  const count = await prisma.challan.count({
    where: { challanNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

export type ChallanItemInput = {
  profileId: string;
  quantity: number;
  length?: number;
  weight: number;
  remarks?: string;
};

export async function processChallanOutwardIssue(
  challanId: string,
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUniqueOrThrow({
      where: { id: challanId },
      include: { items: { include: { profile: true } } },
    });

    if (challan.type !== ChallanType.OUTWARD) {
      throw new Error("Invalid challan type for outward issue");
    }
    if (challan.status !== ChallanStatus.DRAFT) {
      throw new Error("Challan already issued");
    }

    for (const item of challan.items) {
      const profile = await tx.profile.findUniqueOrThrow({
        where: { id: item.profileId },
      });
      if (profile.currentStock < item.weight) {
        throw new Error(
          `Insufficient stock for ${profile.profileCode} (need ${item.weight} KG)`
        );
      }
    }

    for (const item of challan.items) {
      const profile = await tx.profile.update({
        where: { id: item.profileId },
        data: { currentStock: { decrement: item.weight } },
      });
      await createLedgerEntry(tx, {
        profileId: item.profileId,
        transactionType: TransactionType.CHALLAN_OUTWARD,
        quantity: -item.weight,
        balance: profile.currentStock,
        userId,
        remarks: `Outward Challan ${challan.challanNumber}`,
      });
      await checkLowStock(
        tx,
        item.profileId,
        item.profile.profileCode,
        profile.currentStock,
        profile.lowStockThreshold
      );
    }

    return tx.challan.update({
      where: { id: challanId },
      data: { status: ChallanStatus.ISSUED },
      include: {
        items: { include: { profile: true } },
        vendor: true,
        project: true,
        parentChallan: true,
      },
    });
  });
}

export async function processChallanReturnComplete(
  challanId: string,
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUniqueOrThrow({
      where: { id: challanId },
      include: { items: { include: { profile: true } } },
    });

    if (challan.type !== ChallanType.RETURN) {
      throw new Error("Invalid challan type for return");
    }
    if (challan.status === ChallanStatus.COMPLETED) {
      throw new Error("Return challan already completed");
    }

    for (const item of challan.items) {
      const profile = await tx.profile.update({
        where: { id: item.profileId },
        data: { powderCoatedStock: { increment: item.weight } },
      });
      await createLedgerEntry(tx, {
        profileId: item.profileId,
        transactionType: TransactionType.CHALLAN_RETURN,
        quantity: item.weight,
        balance: profile.powderCoatedStock,
        userId,
        remarks: `Return Challan ${challan.challanNumber}`,
      });
    }

    return tx.challan.update({
      where: { id: challanId },
      data: {
        status: ChallanStatus.COMPLETED,
        receivedDate: new Date(),
      },
      include: {
        items: { include: { profile: true } },
        vendor: true,
        project: true,
        parentChallan: true,
      },
    });
  });
}

export async function logChallanActivity(
  userId: string,
  action: string,
  challanId: string,
  details: string
) {
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      entity: "Challan",
      entityId: challanId,
      details,
    },
  });
}

export const CHALLAN_TYPE_LABELS: Record<ChallanType, string> = {
  OUTWARD: "Outward Challan",
  POWDER_COATING: "Powder Coating Challan",
  RETURN: "Return Challan",
};

export const CHALLAN_STATUS_LABELS: Record<ChallanStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  SENT_FOR_COATING: "Sent for Coating",
  IN_PROCESS: "In Process",
  RETURNED: "Returned",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function colorLabel(color: PowderCoatingColor | null | undefined) {
  if (!color) return "—";
  return color.replace(/_/g, " ");
}
