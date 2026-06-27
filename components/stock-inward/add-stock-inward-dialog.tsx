"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { StockInwardFormFields } from "@/components/stock-inward/stock-inward-form-fields";
import {
  buildStockInwardEntriesFromAddForm,
  createEmptyStockInwardProfileRow,
  DEFAULT_STOCK_INWARD_SUPPLIER,
  stockInwardAddFormSchema,
  type StockInwardAddFormData,
} from "@/lib/stock-inward-form";
import { generateId } from "@/lib/utils";
import { showAddedToast } from "@/lib/toast";
import type { Profile, StockInward } from "@/types";

interface AddStockInwardDialogProps {
  profiles: Profile[];
  existingInward: StockInward[];
  onSave: (entries: StockInward[]) => void;
}

const emptyFormValues: StockInwardAddFormData = {
  date: new Date().toISOString().split("T")[0],
  invoiceNo: "",
  supplier: DEFAULT_STOCK_INWARD_SUPPLIER,
  profileRows: [createEmptyStockInwardProfileRow()],
};

export function AddStockInwardDialog({
  profiles,
  existingInward,
  onSave,
}: AddStockInwardDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<StockInwardAddFormData>({
    resolver: zodResolver(stockInwardAddFormSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: emptyFormValues,
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

  const resetForm = () => {
    reset({
      ...emptyFormValues,
      date: new Date().toISOString().split("T")[0],
    });
  };

  const onSubmit = (data: StockInwardAddFormData) => {
    const entries = buildStockInwardEntriesFromAddForm(
      data,
      profiles,
      existingInward,
      () => generateId("si")
    );
    if (entries.length === 0) return;

    showAddedToast("Stock inward");
    onSave(entries);
    resetForm();
    setOpen(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
      size="2xl"
      title="Add Stock Inward"
      description="Record incoming aluminium profile stock with weight, length, and supplier details."
      trigger={
        <Button>
          <Plus className="h-4 w-4" />
          Add Stock
        </Button>
      }
      onSubmit={handleSubmit(onSubmit)}
      footer={
        <FormDialogActions
          onCancel={() => {
            setOpen(false);
            resetForm();
          }}
          submitLabel={entryCount > 1 ? `Save ${entryCount} Entries` : "Save Stock"}
          loadingLabel="Saving"
          isSubmitting={isSubmitting}
          disabled={profiles.length === 0}
        />
      }
    >
      <StockInwardFormFields
        form={form}
        profiles={profiles}
        isSubmitted={isSubmitted}
      />
    </FormDialog>
  );
}
