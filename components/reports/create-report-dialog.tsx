"use client";

import { useMemo, useState } from "react";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { FormField, FormSection } from "@/components/shared/form-field";
import {
  createReportFormSchema,
  generateReportNo,
  REPORT_TYPES,
  type ReportFormData,
} from "@/lib/report-form";
import { fieldInvalid, resolveFieldError } from "@/lib/form-utils";
import { generateId } from "@/lib/utils";
import type { Report } from "@/types";

interface CreateReportDialogProps {
  existingReports: Report[];
  onSave: (report: Report) => void;
}

export function CreateReportDialog({ existingReports, onSave }: CreateReportDialogProps) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const monthStart = `${today.slice(0, 8)}01`;

  const schema = useMemo(
    () => createReportFormSchema((existingReports ?? []).map((report) => report.name)),
    [existingReports]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<ReportFormData>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: {
      name: "",
      type: "summary",
      dateFrom: monthStart,
      dateTo: today,
    },
  });

  const closeDialog = () => {
    setOpen(false);
    reset({ name: "", type: "summary", dateFrom: monthStart, dateTo: today });
  };

  const onSubmit = (data: ReportFormData) => {
    onSave({
      id: generateId("rpt"),
      reportNo: generateReportNo(existingReports),
      name: data.name.trim(),
      type: data.type,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      createdAt: new Date().toISOString(),
      status: "generated",
    });
    closeDialog();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Create Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Report</DialogTitle>
          <DialogDescription>
            Generate an analytics report for a selected date range and report type.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="Report configuration">
            <FormField
              label="Report Name"
              htmlFor="reportName"
              required
              error={resolveFieldError(isSubmitted, errors.name)}
            >
              <Input
                id="reportName"
                placeholder="e.g. June Stock Movement"
                aria-invalid={fieldInvalid(isSubmitted, errors.name)}
                {...register("name")}
              />
            </FormField>
            <FormField
              label="Report Type"
              required
              error={resolveFieldError(isSubmitted, errors.type)}
            >
              <SearchableSelect
                value={watch("type")}
                onValueChange={(value) =>
                  setValue("type", value as ReportFormData["type"], { shouldValidate: isSubmitted })
                }
                options={REPORT_TYPES.map((entry) => ({
                  value: entry.value,
                  label: entry.label,
                }))}
                placeholder="Select report type"
                searchPlaceholder="Search report type…"
                aria-invalid={fieldInvalid(isSubmitted, errors.type)}
              />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="From Date"
                htmlFor="dateFrom"
                required
                error={resolveFieldError(isSubmitted, errors.dateFrom)}
              >
                <Input
                  id="dateFrom"
                  type="date"
                  aria-invalid={fieldInvalid(isSubmitted, errors.dateFrom)}
                  {...register("dateFrom")}
                />
              </FormField>
              <FormField
                label="To Date"
                htmlFor="dateTo"
                required
                error={resolveFieldError(isSubmitted, errors.dateTo)}
              >
                <Input
                  id="dateTo"
                  type="date"
                  aria-invalid={fieldInvalid(isSubmitted, errors.dateTo)}
                  {...register("dateTo")}
                />
              </FormField>
            </div>
          </FormSection>
          <FormDialogActions
            onCancel={closeDialog}
            submitLabel="Generate Report"
            loadingLabel="Generating"
            isSubmitting={isSubmitting}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
