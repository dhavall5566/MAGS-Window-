"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
} as const;

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  trigger?: React.ReactNode;
  size?: keyof typeof sizeClasses;
  /** When provided, the body + footer are wrapped in a <form>. */
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  footer?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
  contentClassName?: string;
}

/** Portaled select/popover layers render outside the dialog DOM tree. */
function isPortaledLayerTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("[data-radix-popper-content-wrapper]") ??
      target.closest("[data-radix-select-viewport]")
  );
}

/** Keep the dialog open while interacting with portaled dropdowns. */
function ignorePortaledLayerDismiss(event: Event) {
  if (isPortaledLayerTarget(event.target)) {
    event.preventDefault();
  }
}

/** Consistent dialog shell: fixed header, scrollable body, footer bar. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  size = "lg",
  onSubmit,
  footer,
  children,
  bodyClassName,
  contentClassName,
}: FormDialogProps) {
  const body = (
    <div className={cn("min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5", bodyClassName)}>
      {children}
    </div>
  );

  const footerNode = footer ? (
    <div className="border-t bg-muted/20 px-6 py-4">{footer}</div>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className={cn(
          "flex max-h-[min(92dvh,calc(100vh-1.5rem))] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:w-full",
          sizeClasses[size],
          contentClassName
        )}
        onPointerDownOutside={ignorePortaledLayerDismiss}
        onInteractOutside={ignorePortaledLayerDismiss}
        onFocusOutside={ignorePortaledLayerDismiss}
      >
        <div className="border-b px-6 py-5 pr-12">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
        </div>
        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
            {body}
            {footerNode}
          </form>
        ) : (
          <>
            {body}
            {footerNode}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
