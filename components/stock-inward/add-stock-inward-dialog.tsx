"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { StockInwardFormFields } from "@/components/stock-inward/stock-inward-form-fields";
import {
  buildStockInwardEntriesFromAddForm,
  DEFAULT_STOCK_INWARD_SUPPLIER,
  stockInwardAddFormSchema,
  type StockInwardAddFormData,
} from "@/lib/stock-inward-form";
import { generateId } from "@/lib/utils";
import type { Profile, StockInward } from "@/types";

interface AddStockInwardDialogProps {
  profiles: Profile[];
  existingInward: StockInward[];
  onSave: (entries: StockInward[]) => void;
}

const emptyFormValues: StockInwardAddFormData = {
  dyeCode: "",
  profileCode: "",
  supplier: DEFAULT_STOCK_INWARD_SUPPLIER,
  date: new Date().toISOString().split("T")[0],
  invoiceNo: "",
  lengthRows: [{ lengthInMeter: 0, totalWeightKg: 0, totalProfiles: 0 }],
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

  const lengthRowCount = watch("lengthRows")?.length ?? 1;

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

    onSave(entries);
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Stock Inward</DialogTitle>
          <DialogDescription>
            Record incoming aluminium profile stock with weight, length, and supplier details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <StockInwardFormFields
            mode="add"
            form={form}
            profiles={profiles}
            isSubmitted={isSubmitted}
          />
          <FormDialogActions
            onCancel={() => {
              setOpen(false);
              resetForm();
            }}
            submitLabel={lengthRowCount > 1 ? `Save ${lengthRowCount} Entries` : "Save Stock"}
            loadingLabel="Saving"
            isSubmitting={isSubmitting}
            disabled={profiles.length === 0}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
