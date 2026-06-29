"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { StockInwardFormFields } from "@/components/stock-inward/stock-inward-form-fields";
import {
  buildStockInwardEntriesFromEditForm,
  createEmptyStockInwardAddFormDefaults,
  stockInwardAddFormSchema,
  stockInwardEntryToAddFormData,
  type StockInwardAddFormData,
} from "@/lib/stock-inward-form";
import { generateId } from "@/lib/utils";
import type { Profile, StockInward, Vendor } from "@/types";

interface EditStockInwardDialogProps {
  entry: StockInward | null;
  profiles: Profile[];
  vendors: Vendor[];
  existingInward: StockInward[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entries: StockInward[]) => Promise<void>;
}

export function EditStockInwardDialog({
  entry,
  profiles,
  vendors,
  existingInward,
  open,
  onOpenChange,
  onSave,
}: EditStockInwardDialogProps) {
  const form = useForm<StockInwardAddFormData>({
    resolver: zodResolver(stockInwardAddFormSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: createEmptyStockInwardAddFormDefaults(vendors),
  });

  const {
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, isSubmitted },
  } = form;

  const profileRows = watch("profileRows") ?? [];
  const entryCount = profileRows.reduce(
    (total, row) => total + (row.lengthRows?.length ?? 0),
    0
  );

  useEffect(() => {
    if (open && entry) {
      reset(stockInwardEntryToAddFormData(entry, profiles), { keepIsSubmitted: false });
    }
  }, [open, entry, reset, profiles]);

  const onSubmit = async (data: StockInwardAddFormData) => {
    if (!entry) return;

    const entries = buildStockInwardEntriesFromEditForm(
      data,
      profiles,
      entry,
      existingInward,
      () => generateId("si")
    );
    if (entries.length === 0) return;

    onOpenChange(false);

    try {
      await onSave(entries);
    } catch {
      // handleUpdateStock restores prior rows and shows an alert on failure.
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      size="2xl"
      title="Edit Stock Inward"
      description="Update incoming aluminium profile stock with weight, length, and supplier details."
      onSubmit={handleSubmit(onSubmit)}
      footer={
        <FormDialogActions
          onCancel={() => onOpenChange(false)}
          submitLabel={entryCount > 1 ? `Save ${entryCount} Entries` : "Save Changes"}
          loadingLabel="Saving"
          isSubmitting={isSubmitting}
          disabled={!entry || profiles.length === 0}
        />
      }
    >
      <StockInwardFormFields
        form={form}
        profiles={profiles}
        vendors={vendors}
        isSubmitted={isSubmitted}
        idPrefix="edit-stock"
      />
    </FormDialog>
  );
}
