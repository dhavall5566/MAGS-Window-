"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getVendorTypeLabel } from "@/lib/vendor";
import type { Vendor } from "@/types";

interface VendorDeleteConfirmDialogProps {
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
}

export function VendorDeleteConfirmDialog({
  vendor,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}: VendorDeleteConfirmDialogProps) {
  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="border-b bg-destructive/10 px-6 pb-4 pt-6">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <Trash2 className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <DialogTitle className="text-base">Delete vendor?</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  This will permanently remove{" "}
                  <span className="font-medium text-foreground">{vendor.partyName}</span> from
                  your vendor list. This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-3 px-6 py-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{vendor.partyName}</p>
              <Badge variant="outline" className="text-xs">
                {getVendorTypeLabel(vendor.vendorType)}
              </Badge>
            </div>
            {vendor.partyAddress?.trim() ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {vendor.partyAddress}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 border-t bg-muted/20 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete vendor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
