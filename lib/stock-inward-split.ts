import {
  calculateTotalWeightKg,
  normalizeStockInwardRecord,
} from "@/lib/stock-inward-calculations";
import { generateInwardNos } from "@/lib/stock-inward-form";
import { normalizeStockLength } from "@/lib/stock-master";
import type { StockInward } from "@/types";

export const STOCK_INWARD_SPLIT_LENGTH_TOLERANCE = 0.0001;

export interface StockInwardSplitPiece {
  lengthInMeter: number;
}

export interface StockInwardSplitResult {
  updatedParent: StockInward;
  children: StockInward[];
}

export function isSplittableStockInward(entry: StockInward): boolean {
  if (entry.status === "split") return false;
  const length = normalizeStockLength(entry.length ?? 0);
  const qty = entry.quantity ?? 0;
  const weight = entry.totalWeightKg ?? entry.weight ?? 0;
  return length > STOCK_INWARD_SPLIT_LENGTH_TOLERANCE && qty > 0 && weight > 0;
}

export function sumSplitPieceLengths(pieces: StockInwardSplitPiece[]): number {
  return pieces.reduce(
    (total, piece) => total + normalizeStockLength(piece.lengthInMeter),
    0
  );
}

export function validateStockInwardSplit(
  parent: StockInward,
  pieces: StockInwardSplitPiece[]
): string | null {
  if (!isSplittableStockInward(parent)) {
    return "This stock inward entry cannot be split.";
  }

  if (pieces.length < 2) {
    return "Enter at least two piece lengths.";
  }

  const parentLength = normalizeStockLength(parent.length ?? 0);
  let splitTotal = 0;

  for (const piece of pieces) {
    const length = normalizeStockLength(piece.lengthInMeter);
    if (length <= STOCK_INWARD_SPLIT_LENGTH_TOLERANCE) {
      return "Each piece length must be greater than zero.";
    }
    if (length >= parentLength - STOCK_INWARD_SPLIT_LENGTH_TOLERANCE) {
      return "Each piece length must be less than the original length.";
    }
    splitTotal += length;
  }

  splitTotal = normalizeStockLength(splitTotal);
  if (Math.abs(splitTotal - parentLength) > STOCK_INWARD_SPLIT_LENGTH_TOLERANCE) {
    return `Piece lengths must add up to ${parentLength} m. Current total: ${splitTotal} m.`;
  }

  return null;
}

export function buildRemainderSplitPiece(
  parentLength: number,
  pieces: StockInwardSplitPiece[]
): StockInwardSplitPiece | null {
  const enteredTotal = sumSplitPieceLengths(pieces);
  const remainder = normalizeStockLength(parentLength - enteredTotal);
  if (remainder <= STOCK_INWARD_SPLIT_LENGTH_TOLERANCE) return null;
  return { lengthInMeter: remainder };
}

export function splitStockInward(
  parent: StockInward,
  pieces: StockInwardSplitPiece[],
  existingInward: StockInward[],
  createId: () => string,
  splitAt = new Date().toISOString().split("T")[0]
): StockInwardSplitResult {
  const normalizedParent = normalizeStockInwardRecord(parent);
  const error = validateStockInwardSplit(normalizedParent, pieces);
  if (error) {
    throw new Error(error);
  }

  const parentQty = normalizedParent.quantity ?? 0;
  const kgPerMeter = normalizedParent.kgPerMeter ?? 0;
  const parentWeight = normalizedParent.totalWeightKg ?? normalizedParent.weight ?? 0;
  const parentManual = normalizedParent.totalWeightManualKg;
  const inwardNos = generateInwardNos(existingInward, pieces.length);

  const children: StockInward[] = pieces.map((piece, index) => {
    const length = normalizeStockLength(piece.lengthInMeter);
    const totalWeightKg = calculateTotalWeightKg(parentQty, length, kgPerMeter);
    const totalWeightManualKg =
      parentManual != null && parentWeight > 0
        ? Math.round((parentManual * totalWeightKg) / parentWeight * 100) / 100
        : undefined;

    return normalizeStockInwardRecord({
      id: createId(),
      inwardNo: inwardNos[index],
      invoiceNo: normalizedParent.invoiceNo,
      date: splitAt,
      supplier: normalizedParent.supplier,
      dyeCode: normalizedParent.dyeCode,
      profileCode: normalizedParent.profileCode,
      profileName: normalizedParent.profileName,
      profileImage: normalizedParent.profileImage,
      totalWeightKg,
      totalWeightManualKg,
      length,
      kgPerMeter,
      quantity: parentQty,
      weight: totalWeightKg,
      splitFromId: normalizedParent.id,
      splitFromInwardNo: normalizedParent.inwardNo,
      splitAt,
      status: "active",
      remarks: normalizedParent.remarks,
    });
  });

  const updatedParent = normalizeStockInwardRecord({
    ...normalizedParent,
    status: "split",
    splitAt,
    totalWeightKg: 0,
    totalWeightManualKg: undefined,
    weight: 0,
    quantity: 0,
  });

  return { updatedParent, children };
}

export function isSplitParentStockInward(entry: StockInward): boolean {
  return entry.status === "split";
}
