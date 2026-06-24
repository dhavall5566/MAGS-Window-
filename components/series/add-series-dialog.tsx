"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { FormField, FormSection } from "@/components/shared/form-field";
import { seriesFormSchema, type SeriesFormData } from "@/lib/series-form";
import { fieldInvalid, resolveFieldError } from "@/lib/form-utils";
import { generateId } from "@/lib/utils";
import type { SeriesName } from "@/types";

interface AddSeriesDialogProps {
  onSave: (series: SeriesName) => void;
}

export function AddSeriesDialog({ onSave }: AddSeriesDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<SeriesFormData>({
    resolver: zodResolver(seriesFormSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: { name: "", seriesNo: "" },
  });

  const closeDialog = () => {
    setOpen(false);
    reset();
  };

  const onSubmit = (data: SeriesFormData) => {
    onSave({
      id: generateId("ser"),
      name: data.name.toUpperCase(),
      seriesNo: data.seriesNo,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    });
    closeDialog();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Series
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Series</DialogTitle>
          <DialogDescription>
            Define a series code used when creating profiles (e.g. MS + 150 → MS150).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="Series identity">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Series Name"
                htmlFor="name"
                required
                hint="Up to 2 letters"
                error={resolveFieldError(isSubmitted, errors.name)}
              >
                <Input
                  id="name"
                  placeholder="MS"
                  maxLength={2}
                  aria-invalid={fieldInvalid(isSubmitted, errors.name)}
                  {...register("name", {
                    onChange: (e) => {
                      const value = e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 2);
                      e.target.value = value.toUpperCase();
                      setValue("name", value.toUpperCase(), { shouldValidate: false });
                    },
                  })}
                />
              </FormField>
              <FormField
                label="Series No."
                htmlFor="seriesNo"
                required
                hint="Numeric suffix"
                error={resolveFieldError(isSubmitted, errors.seriesNo)}
              >
                <Input
                  id="seriesNo"
                  placeholder="150"
                  inputMode="numeric"
                  aria-invalid={fieldInvalid(isSubmitted, errors.seriesNo)}
                  {...register("seriesNo", {
                    onChange: (e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      e.target.value = value;
                      setValue("seriesNo", value, { shouldValidate: false });
                    },
                  })}
                />
              </FormField>
            </div>
          </FormSection>
          <FormDialogActions
            onCancel={closeDialog}
            submitLabel="Save Series"
            loadingLabel="Saving"
            isSubmitting={isSubmitting}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
