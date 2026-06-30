"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VendorAssociationGroup } from "@/lib/vendor-associations";
import { cn } from "@/lib/utils";

interface VendorDeleteBlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorName: string;
  associations: VendorAssociationGroup[];
  fallbackMessage?: string;
}

export function VendorDeleteBlockedDialog({
  open,
  onOpenChange,
  vendorName,
  associations,
  fallbackMessage,
}: VendorDeleteBlockedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="border-b bg-amber-500/10 px-6 pb-4 pt-6">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <DialogTitle className="text-base">Cannot delete vendor</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  <span className="font-medium text-foreground">{vendorName}</span> is linked to
                  records elsewhere. Remove those links before deleting this vendor.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-3 px-6 py-4">
          {fallbackMessage ? (
            <Card className="border-amber-500/20 bg-muted/30 shadow-none">
              <CardContent className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-muted-foreground">
                {fallbackMessage}
              </CardContent>
            </Card>
          ) : (
            associations.map((item) => (
              <Card
                key={item.module}
                className="border-amber-500/20 bg-muted/30 shadow-none"
              >
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{item.module}</p>
                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      {item.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  {item.records.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {item.records.map((record) => (
                        <Link
                          key={record.id}
                          href={record.href}
                          onClick={() => onOpenChange(false)}
                          className="inline-flex"
                        >
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-xs font-normal transition-colors",
                              "cursor-pointer hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                            )}
                          >
                            {record.label}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}

          <p className="text-xs text-muted-foreground">
            Delete those records first, then try again.
          </p>
        </div>

        <DialogFooter className="border-t bg-muted/20 px-6 py-4 sm:justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
