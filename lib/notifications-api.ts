import { fetchJson, invalidateJsonCache } from "@/lib/fetch-json";
import type { Notification, NotificationCategory } from "@/types";

const API_URL = "/api/notifications";
const EMPTY = { notifications: [] as Notification[] };

export const NOTIFICATIONS_CHANGED_EVENT = "mags:notifications-changed";

export function notifyNotificationsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
}

export async function fetchEventNotifications(): Promise<Notification[]> {
  const data = await fetchJson<{ notifications?: Notification[] }>(API_URL, EMPTY, {
    force: false,
  });
  return (data.notifications ?? []).filter((item) => item.source === "event");
}

export async function fetchEventNotificationsFresh(): Promise<Notification[]> {
  invalidateJsonCache(API_URL);
  return fetchEventNotifications();
}

export type PushEventNotificationInput = {
  title: string;
  message: string;
  type?: Notification["type"];
  category?: NotificationCategory;
  href?: string;
  entityId?: string;
};

export async function pushEventNotification(
  input: PushEventNotificationInput
): Promise<Notification | null> {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        type: input.type ?? "info",
        source: "event",
        read: false,
      }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { notification?: Notification };
    invalidateJsonCache(API_URL);
    notifyNotificationsChanged();
    return data.notification ?? null;
  } catch {
    return null;
  }
}

export async function markEventNotificationRead(notificationId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_URL}/${encodeURIComponent(notificationId)}/read`,
      { method: "PATCH" }
    );
    if (!res.ok) return false;
    invalidateJsonCache(API_URL);
    notifyNotificationsChanged();
    return true;
  } catch {
    return false;
  }
}

export async function markAllEventNotificationsRead(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/mark-all-read`, { method: "POST" });
    if (!res.ok) return false;
    invalidateJsonCache(API_URL);
    notifyNotificationsChanged();
    return true;
  } catch {
    return false;
  }
}
