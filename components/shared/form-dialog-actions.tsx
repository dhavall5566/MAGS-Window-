"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

interface FormDialogActionsProps {
  onCancel: () => void;
  submitLabel: string;
  loadingLabel?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  cancelLabel?: string;
}

export function FormDialogActions({
  onCancel,
  submitLabel,
  loadingLabel,
  isSubmitting = false,
  disabled = false,
  cancelLabel = "Cancel",
}: FormDialogActionsProps) {
  const label = isSubmitting ? (loadingLabel ?? `${submitLabel}…`) : submitLabel;

  return (
    <DialogFooter className="gap-2 sm:gap-0">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        {cancelLabel}
      </Button>
      <Button type="submit" disabled={disabled || isSubmitting} className="min-w-[7.5rem]">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {label}
      </Button>
    </DialogFooter>
  );
}
