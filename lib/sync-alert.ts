import { notifySyncFailure } from "@/lib/notifications/event-notifications";

export function alertSyncFailure(
  message = "Could not sync to the server. Changes were reverted. Please check that the backend is running."
) {
  alert(message);
  notifySyncFailure(message);
}
