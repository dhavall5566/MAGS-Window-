import { mutate, read } from "./mock-store";
import type { ChallanType } from "./types";
import { enrichChallan, getProfileById } from "./data-access";

const PREFIX: Record<ChallanType, string> = {
  OUTWARD: "OUT",
  POWDER_COATING: "PC",
  RETURN: "RET",
};

export async function generateChallanNumber(type: ChallanType) {
  const year = new Date().getFullYear();
  const prefix = `MAGS/${PREFIX[type]}/${year}/`;
  const count = read((d) =>
    d.challans.filter((c) => c.challanNumber.startsWith(prefix)).length
  );
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

export type ChallanItemInput = {
  profileId: string;
  quantity: number;
  length?: number;
  weight: number;
  remarks?: string;
};

function pushLedgerEntry(
  d: import("./types").Database,
  profileId: string,
  transactionType: "CHALLAN_OUTWARD" | "CHALLAN_RETURN",
  quantity: number,
  balance: number,
  userId: string,
  remarks?: string
) {
  d.stockLedgers.push({
    id: `sl_${Date.now()}_${profileId}`,
    profileId,
    transactionType,
    quantity,
    balance,
    userId,
    remarks,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
}

export async function processChallanOutwardIssue(challanId: string, userId: string) {
  return mutate((d) => {
    const challan = d.challans.find((c) => c.id === challanId);
    if (!challan) throw new Error("Challan not found");
    if (challan.type !== "OUTWARD") {
      throw new Error("Invalid challan type for outward issue");
    }
    if (challan.status !== "DRAFT") {
      throw new Error("Challan already issued");
    }

    const items = d.challanItems.filter((i) => i.challanId === challanId);
    for (const item of items) {
      const profile = getProfileById(d, item.profileId)!;
      if (profile.currentStock < item.weight) {
        throw new Error(
          `Insufficient stock for ${profile.profileCode} (need ${item.weight} KG)`
        );
      }
    }

    for (const item of items) {
      const profile = getProfileById(d, item.profileId)!;
      profile.currentStock -= item.weight;
      profile.updatedAt = new Date().toISOString();
      pushLedgerEntry(
        d,
        item.profileId,
        "CHALLAN_OUTWARD",
        -item.weight,
        profile.currentStock,
        userId,
        `Outward Challan ${challan.challanNumber}`
      );
      if (profile.currentStock <= profile.lowStockThreshold) {
        const admins = d.users.filter(
          (u) => u.role === "ADMINISTRATOR" && u.status === "ACTIVE"
        );
        admins.forEach((u) => {
          d.notifications.unshift({
            id: `n_${Date.now()}_${u.id}`,
            userId: u.id,
            title: "Low Stock Alert",
            message: `Profile ${profile.profileCode} is low on stock (${profile.currentStock.toFixed(2)} KG remaining).`,
            read: false,
            type: "warning",
            createdAt: new Date().toISOString(),
          });
        });
      }
    }

    challan.status = "ISSUED";
    challan.updatedAt = new Date().toISOString();
    return enrichChallan(d, challan);
  });
}

export async function processChallanReturnComplete(challanId: string, userId: string) {
  return mutate((d) => {
    const challan = d.challans.find((c) => c.id === challanId);
    if (!challan) throw new Error("Challan not found");
    if (challan.type !== "RETURN") {
      throw new Error("Invalid challan type for return");
    }
    if (challan.status === "COMPLETED") {
      throw new Error("Return challan already completed");
    }

    const items = d.challanItems.filter((i) => i.challanId === challanId);
    for (const item of items) {
      const profile = getProfileById(d, item.profileId)!;
      profile.powderCoatedStock += item.weight;
      profile.updatedAt = new Date().toISOString();
      pushLedgerEntry(
        d,
        item.profileId,
        "CHALLAN_RETURN",
        item.weight,
        profile.powderCoatedStock,
        userId,
        `Return Challan ${challan.challanNumber}`
      );
    }

    challan.status = "COMPLETED";
    challan.receivedDate = new Date().toISOString();
    challan.updatedAt = new Date().toISOString();
    return enrichChallan(d, challan);
  });
}

export async function logChallanActivity(
  userId: string,
  action: string,
  challanId: string,
  details: string
) {
  mutate((d) => {
    d.activityLogs.unshift({
      id: `al_${Date.now()}`,
      userId,
      action,
      entity: "Challan",
      entityId: challanId,
      details,
      createdAt: new Date().toISOString(),
    });
  });
}

export {
  CHALLAN_TYPE_LABELS,
  CHALLAN_STATUS_LABELS,
  colorLabel,
} from "./challan-labels";
