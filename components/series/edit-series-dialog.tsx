"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { FormField, FormSection } from "@/components/shared/form-field";
import { seriesFormSchema, type SeriesFormData } from "@/lib/series-form";
import { fieldInvalid, resolveFieldError } from "@/lib/form-utils";
import type { SeriesName } from "@/types";

interface EditSeriesDialogProps {
  series: SeriesName | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Pick<SeriesName, "name" | "seriesNo">) => void;
}

export function EditSeriesDialog({
  series,
  open,
  onOpenChange,
  onSave,
}: EditSeriesDialogProps) {
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

  useEffect(() => {
    if (open && series) {
      reset({ name: series.name, seriesNo: series.seriesNo }, { keepIsSubmitted: false });
    }
  }, [open, series, reset]);

  const onSubmit = (data: SeriesFormData) => {
    if (!series) return;
    onSave(series.id, {
      name: data.name.toUpperCase(),
      seriesNo: data.seriesNo,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Series</DialogTitle>
          <DialogDescription>Update the series code used in profile master.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="Series identity">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Series Name"
                htmlFor="edit-series-name"
                required
                error={resolveFieldError(isSubmitted, errors.name)}
              >
                <Input
                  id="edit-series-name"
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
                htmlFor="edit-series-no"
                required
                error={resolveFieldError(isSubmitted, errors.seriesNo)}
              >
                <Input
                  id="edit-series-no"
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
            onCancel={() => onOpenChange(false)}
            submitLabel="Save Changes"
            loadingLabel="Saving"
            isSubmitting={isSubmitting}
            disabled={!series}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
