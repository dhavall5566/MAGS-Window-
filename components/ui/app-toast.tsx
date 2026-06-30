"use client";

import { CheckCircle2, Info, Trash2, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type AppToastVariant = "success" | "error" | "info";
export type AppToastAction = "added" | "saved" | "deleted";

const TOAST_DURATION_MS = 2800;

const VARIANT_CONFIG: Record<
  AppToastVariant,
  { icon: typeof CheckCircle2; label: string }
> = {
  success: { icon: CheckCircle2, label: "Success" },
  error: { icon: XCircle, label: "Error" },
  info: { icon: Info, label: "Notice" },
};

export interface AppToastProps {
  id: string | number;
  variant?: AppToastVariant;
  title: string;
  description?: string;
  action?: AppToastAction;
}

function ToastIcon({
  variant,
  action,
}: {
  variant: AppToastVariant;
  action?: AppToastAction;
}) {
  if (action === "deleted") {
    return <Trash2 className="h-4 w-4" aria-hidden />;
  }

  const Icon = VARIANT_CONFIG[variant].icon;
  return <Icon className="h-4 w-4" aria-hidden />;
}

export function AppToast({
  id,
  variant = "success",
  title,
  description,
  action,
}: AppToastProps) {
  return (
    <div
      className={cn(
        "app-toast",
        action ? `app-toast-action-${action}` : `app-toast-${variant}`
      )}
      role="status"
      aria-live="polite"
    >
      <div className="app-toast-accent" aria-hidden />
      <div className="app-toast-icon">
        <ToastIcon variant={variant} action={action} />
      </div>
      <div className="app-toast-body">
        <p className="app-toast-title">{title}</p>
        {description ? <p className="app-toast-description">{description}</p> : null}
      </div>
      <button
        type="button"
        className="app-toast-close"
        aria-label="Dismiss notification"
        onClick={() => toast.dismiss(id)}
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}

function descriptionForAction(action: AppToastAction, entity: string): string {
  switch (action) {
    case "added":
      return `${entity} is now available in your list.`;
    case "saved":
      return `${entity} changes were saved successfully.`;
    case "deleted":
      return `${entity} was removed from your list.`;
  }
}

function pushAppToast({
  id,
  variant = "success",
  action,
  title,
  description,
}: {
  id: string;
  variant?: AppToastVariant;
  action?: AppToastAction;
  title: string;
  description?: string;
}) {
  toast.custom(
    (toastId) => (
      <AppToast
        id={toastId}
        variant={variant}
        action={action}
        title={title}
        description={description}
      />
    ),
    {
      id,
      duration: TOAST_DURATION_MS,
    }
  );
}

export function showAddedToast(entity: string) {
  pushAppToast({
    id: `${entity}-added`,
    action: "added",
    title: `${entity} added`,
    description: descriptionForAction("added", entity),
  });
}

export function showSavedToast(entity: string) {
  pushAppToast({
    id: `${entity}-saved`,
    action: "saved",
    title: `${entity} saved`,
    description: descriptionForAction("saved", entity),
  });
}

export function showDeletedToast(entity: string) {
  pushAppToast({
    id: `${entity}-deleted`,
    action: "deleted",
    title: `${entity} deleted`,
    description: descriptionForAction("deleted", entity),
  });
}

export function showErrorToast(title: string, description?: string) {
  pushAppToast({
    id: `error-${title}`,
    variant: "error",
    title,
    description,
  });
}

/** Fire toast first so it paints before any synchronous persist work. */
export function runAfterToast(notify: () => void, action: () => void) {
  notify();
  queueMicrotask(action);
}
