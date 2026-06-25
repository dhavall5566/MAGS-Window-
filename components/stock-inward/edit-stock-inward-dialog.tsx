"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { StockInwardFormFields } from "@/components/stock-inward/stock-inward-form-fields";
import {
  buildStockInwardEntry,
  DEFAULT_STOCK_INWARD_SUPPLIER,
  normalizeStockInwardSupplier,
  stockInwardFormSchema,
  type StockInwardFormData,
} from "@/lib/stock-inward-form";
import type { Profile, StockInward } from "@/types";

interface EditStockInwardDialogProps {
  entry: StockInward | null;
  profiles: Profile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entry: StockInward) => void;
}

export function EditStockInwardDialog({
  entry,
  profiles,
  open,
  onOpenChange,
  onSave,
}: EditStockInwardDialogProps) {
  const form = useForm<StockInwardFormData>({
    resolver: zodResolver(stockInwardFormSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: {
      dyeCode: "",
      profileCode: "",
      supplier: DEFAULT_STOCK_INWARD_SUPPLIER,
      date: "",
      invoiceNo: "",
      totalWeightKg: 0,
      totalProfiles: 0,
      lengthInMeter: 0,
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting, isSubmitted },
  } = form;

  useEffect(() => {
    if (open && entry) {
      reset(
        {
          dyeCode: entry.dyeCode ?? "",
          profileCode: entry.profileCode,
          supplier: normalizeStockInwardSupplier(entry.supplier),
          date: entry.date,
          invoiceNo: entry.invoiceNo ?? "",
          totalWeightKg: entry.totalWeightKg ?? entry.weight ?? 0,
          totalProfiles: entry.quantity ?? 0,
          lengthInMeter: entry.length ?? 0,
        },
        { keepIsSubmitted: false }
      );
    }
  }, [open, entry, reset]);

  const onSubmit = (data: StockInwardFormData) => {
    if (!entry) return;

    const updated = buildStockInwardEntry(data, profiles, {
      id: entry.id,
      inwardNo: entry.inwardNo,
      remarks: entry.remarks,
    });
    if (!updated) return;

    onSave(updated);
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Stock Inward"
      description="Update weight, length, and supplier for this inward entry."
      onSubmit={handleSubmit(onSubmit)}
      footer={
        <FormDialogActions
          onCancel={() => onOpenChange(false)}
          submitLabel="Save Changes"
          loadingLabel="Saving"
          isSubmitting={isSubmitting}
          disabled={!entry}
        />
      }
    >
      <StockInwardFormFields
        form={form}
        profiles={profiles}
        isSubmitted={isSubmitted}
        idPrefix="edit-stock"
      />
    </FormDialog>
  );
}
