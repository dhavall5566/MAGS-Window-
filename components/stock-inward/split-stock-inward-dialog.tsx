"use client";

import { useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateTotalWeightKg,
  formatStockLength,
  getStockInwardKgPerMeter,
} from "@/lib/stock-inward-calculations";
import {
  isSplittableStockInward,
  splitStockInward,
  STOCK_INWARD_SPLIT_LENGTH_TOLERANCE,
  sumSplitPieceLengths,
  validateStockInwardSplit,
} from "@/lib/stock-inward-split";
import { normalizeStockLength } from "@/lib/stock-master";
import { formatNumber, generateId } from "@/lib/utils";
import { showSavedToast } from "@/lib/toast";
import type { Profile, StockInward } from "@/types";

const splitFormSchema = z.object({
  pieces: z
    .array(
      z.object({
        lengthInMeter: z.string(),
      })
    )
    .min(2, "Add at least two piece lengths"),
});

type SplitFormData = z.infer<typeof splitFormSchema>;

function parsePieceLengthInput(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatPieceLengthInput(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

interface SplitStockInwardDialogProps {
  entry: StockInward | null;
  profiles: Profile[];
  existingInward: StockInward[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (result: { updatedParent: StockInward; children: StockInward[] }) => Promise<void>;
}

function createDefaultPieces(parentLength: number): SplitFormData["pieces"] {
  const half = normalizeStockLength(parentLength / 2);
  const remainder = normalizeStockLength(parentLength - half);
  return [
    { lengthInMeter: formatStockLength(half) },
    { lengthInMeter: formatStockLength(remainder) },
  ];
}

export function SplitStockInwardDialog({
  entry,
  profiles,
  existingInward,
  open,
  onOpenChange,
  onSave,
}: SplitStockInwardDialogProps) {
  const parentLength = normalizeStockLength(entry?.length ?? 0);
  const parentQty = entry?.quantity ?? 0;
  const kgPerMeter =
    entry?.kgPerMeter ??
    getStockInwardKgPerMeter(
      profiles.find((profile) => profile.code === entry?.profileCode)
    );

  const form = useForm<SplitFormData>({
    resolver: zodResolver(splitFormSchema),
    mode: "onSubmit",
    defaultValues: { pieces: createDefaultPieces(parentLength) },
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "pieces",
  });

  const watchedPieces = watch("pieces");
  const pieces = useMemo(() => watchedPieces ?? [], [watchedPieces]);

  useEffect(() => {
    if (!open || !entry) return;
    reset({ pieces: createDefaultPieces(normalizeStockLength(entry.length ?? 0)) });
    clearErrors("pieces");
  }, [open, entry, reset, clearErrors]);

  const piecePreview = useMemo(() => {
    return pieces.map((piece) => {
      const length = normalizeStockLength(parsePieceLengthInput(piece.lengthInMeter));
      const weight = calculateTotalWeightKg(parentQty, length, kgPerMeter);
      return { length, weight };
    });
  }, [pieces, parentQty, kgPerMeter]);

  const splitTotal = sumSplitPieceLengths(
    pieces.map((piece) => ({ lengthInMeter: parsePieceLengthInput(piece.lengthInMeter) }))
  );
  const lengthMismatch =
    parentLength > 0 &&
    Math.abs(splitTotal - parentLength) > STOCK_INWARD_SPLIT_LENGTH_TOLERANCE;

  const syncRemainderPiece = (nextPieces: SplitFormData["pieces"]) => {
    if (nextPieces.length < 2) return;
    const entered = nextPieces
      .slice(0, -1)
      .reduce(
        (total, piece) =>
          total + normalizeStockLength(parsePieceLengthInput(piece.lengthInMeter)),
        0
      );
    const remainder = normalizeStockLength(parentLength - entered);
    setValue(`pieces.${nextPieces.length - 1}.lengthInMeter`, formatStockLength(remainder), {
      shouldDirty: true,
    });
  };

  const onPieceLengthChange = (index: number, value: string) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;

    setValue(`pieces.${index}.lengthInMeter`, value, { shouldDirty: true });
    if (index < fields.length - 1) {
      syncRemainderPiece(
        pieces.map((piece, pieceIndex) =>
          pieceIndex === index ? { lengthInMeter: value } : piece
        )
      );
    }
  };

  const onSubmit = async (data: SplitFormData) => {
    if (!entry) return;

    const splitPieces = data.pieces.map((piece) => ({
      lengthInMeter: normalizeStockLength(parsePieceLengthInput(piece.lengthInMeter)),
    }));
    const validationError = validateStockInwardSplit(entry, splitPieces);
    if (validationError) {
      setError("pieces", { type: "manual", message: validationError });
      return;
    }

    const result = splitStockInward(
      entry,
      splitPieces,
      existingInward,
      () => generateId("si")
    );

    showSavedToast("Stock split");
    await onSave(result);
    onOpenChange(false);
  };

  if (!entry) return null;

  const canSplit = isSplittableStockInward(entry);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Split Profile Length"
      description="Divide this inward entry into separate lengths. Each piece keeps the same NOS as the original."
      onSubmit={handleSubmit(onSubmit)}
      footer={
        <FormDialogActions
          onCancel={() => onOpenChange(false)}
          submitLabel="Split Length"
          loadingLabel="Splitting"
          isSubmitting={isSubmitting}
          disabled={!canSplit}
        />
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Inward No.</p>
            <p className="font-mono text-sm font-medium">{entry.inwardNo}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Profile</p>
            <p className="text-sm font-medium">
              {entry.profileCode} — {entry.profileName}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Original Length</p>
            <p className="text-sm tabular-nums">{formatStockLength(parentLength)} m</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">NOS</p>
            <p className="text-sm tabular-nums">{formatNumber(parentQty, 2)}</p>
          </div>
        </div>

        {!canSplit && (
          <p className="text-sm text-destructive">
            This entry cannot be split. It may already be split or has no available stock.
          </p>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label>Piece lengths (m)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canSplit}
              onClick={() => {
                append({ lengthInMeter: "" });
                syncRemainderPiece([...pieces, { lengthInMeter: "" }]);
              }}
            >
              <Plus className="h-4 w-4" />
              Add piece
            </Button>
          </div>

          {fields.map((field, index) => {
            const isRemainder = index === fields.length - 1 && fields.length >= 2;
            return (
              <div key={field.id} className="flex items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="text-xs">
                    Piece {index + 1}
                    {isRemainder ? " (remainder)" : ""}
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="tabular-nums"
                    readOnly={isRemainder}
                    disabled={!canSplit}
                    value={formatPieceLengthInput(pieces[index]?.lengthInMeter)}
                    onChange={(event) => onPieceLengthChange(index, event.target.value)}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="text-xs">Weight (kg)</Label>
                  <Input
                    className="bg-muted tabular-nums"
                    readOnly
                    value={
                      piecePreview[index]?.weight
                        ? formatNumber(piecePreview[index].weight, 2)
                        : "—"
                    }
                  />
                </div>
                {fields.length > 2 && index < fields.length - 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-destructive"
                    onClick={() => {
                      remove(index);
                      const nextPieces = pieces.filter((_, pieceIndex) => pieceIndex !== index);
                      syncRemainderPiece(nextPieces);
                    }}
                    aria-label={`Remove piece ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {fields.length > 2 && index >= fields.length - 1 && (
                  <div className="h-9 w-9 shrink-0" />
                )}
              </div>
            );
          })}

          <p
            className={
              lengthMismatch ? "text-sm text-destructive" : "text-sm text-muted-foreground"
            }
          >
            Total: {formatStockLength(splitTotal)} m / {formatStockLength(parentLength)} m
          </p>
          {form.formState.errors.pieces?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.pieces.message}</p>
          )}
          {form.formState.errors.pieces?.root?.message && (
            <p className="text-sm text-destructive">
              {form.formState.errors.pieces.root.message}
            </p>
          )}
        </div>
      </div>
    </FormDialog>
  );
}
