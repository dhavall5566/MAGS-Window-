import { toast } from "sonner";

const TOAST_DURATION_MS = 2200;

function showSuccessToast(message: string, id: string) {
  toast.success(message, {
    id,
    duration: TOAST_DURATION_MS,
  });
}

export function showAddedToast(entity: string) {
  showSuccessToast(`${entity} added`, `${entity}-added`);
}

export function showSavedToast(entity: string) {
  showSuccessToast(`${entity} saved`, `${entity}-saved`);
}

export function showDeletedToast(entity: string) {
  showSuccessToast(`${entity} deleted`, `${entity}-deleted`);
}

/** Fire toast first so it paints before any synchronous persist work. */
export function runAfterToast(notify: () => void, action: () => void) {
  notify();
  queueMicrotask(action);
}
