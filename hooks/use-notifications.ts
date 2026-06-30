"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  fetchEventNotificationsFresh,
  markAllEventNotificationsRead,
  markEventNotificationRead,
  NOTIFICATIONS_CHANGED_EVENT,
} from "@/lib/notifications-api";
import { buildLiveAlerts } from "@/lib/notifications/live-alerts";
import { normalizeStockInwardRecord } from "@/lib/stock-inward-calculations";
import { useCachedOrStoreList } from "@/hooks/use-seeded-list-state";
import { useAppStore } from "@/lib/store";
import type { Notification } from "@/types";

const selectStoreInward = (state: ReturnType<typeof useAppStore.getState>) =>
  state.stockInward ?? [];
const selectStoreChallans = (state: ReturnType<typeof useAppStore.getState>) =>
  state.challans ?? [];

function sortNotifications(items: Notification[]): Notification[] {
  return [...items].sort((a, b) => {
    const unreadDelta = Number(!a.read) - Number(!b.read);
    if (unreadDelta !== 0) return -unreadDelta;

    if (a.source !== b.source) {
      return a.source === "live" ? -1 : 1;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function useNotifications() {
  const [apiInward] = useCachedOrStoreList(
    "/api/stock",
    "inward",
    selectStoreInward,
    normalizeStockInwardRecord
  );
  const [apiChallans] = useCachedOrStoreList(
    "/api/challans",
    "challans",
    selectStoreChallans
  );

  const {
    storeInward,
    storeChallans,
    deletedStockInwardIds,
    lowStockThresholdKg,
    dismissedLiveAlertKeys,
    dismissLiveAlert,
  } = useAppStore(
    useShallow((state) => ({
      storeInward: state.stockInward ?? [],
      storeChallans: state.challans ?? [],
      deletedStockInwardIds: state.deletedStockInwardIds ?? [],
      lowStockThresholdKg: state.settings.lowStockThresholdKg,
      dismissedLiveAlertKeys: state.dismissedLiveAlertKeys ?? [],
      dismissLiveAlert: state.dismissLiveAlert,
    }))
  );

  const [eventNotifications, setEventNotifications] = useState<Notification[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const refreshEvents = useCallback(async () => {
    const events = await fetchEventNotificationsFresh();
    setEventNotifications(events);
    setIsLoadingEvents(false);
  }, []);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  useEffect(() => {
    const handleChange = () => {
      void refreshEvents();
    };
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChange);
  }, [refreshEvents]);

  const liveAlerts = useMemo(
    () =>
      buildLiveAlerts({
        apiInward,
        storeInward,
        deletedStockInwardIds,
        apiChallans,
        storeChallans,
        lowStockThresholdKg,
        dismissedKeys: dismissedLiveAlertKeys,
      }),
    [
      apiInward,
      storeInward,
      deletedStockInwardIds,
      apiChallans,
      storeChallans,
      lowStockThresholdKg,
      dismissedLiveAlertKeys,
    ]
  );

  const notifications = useMemo(
    () => sortNotifications([...liveAlerts, ...eventNotifications]),
    [liveAlerts, eventNotifications]
  );

  const unreadCount = useMemo(
    () =>
      liveAlerts.length +
      eventNotifications.filter((notification) => !notification.read).length,
    [liveAlerts, eventNotifications]
  );

  const markRead = useCallback(
    async (notification: Notification) => {
      if (notification.source === "live") {
        dismissLiveAlert(notification.id);
        return;
      }

      setEventNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item
        )
      );
      const ok = await markEventNotificationRead(notification.id);
      if (!ok) {
        void refreshEvents();
      }
    },
    [dismissLiveAlert, refreshEvents]
  );

  const markAllRead = useCallback(async () => {
    for (const alert of liveAlerts) {
      dismissLiveAlert(alert.id);
    }

    setEventNotifications((current) =>
      current.map((item) => ({ ...item, read: true }))
    );
    const ok = await markAllEventNotificationsRead();
    if (!ok) {
      void refreshEvents();
    }
  }, [dismissLiveAlert, liveAlerts, refreshEvents]);

  return {
    notifications,
    unreadCount,
    isLoadingEvents,
    markRead,
    markAllRead,
    refreshEvents,
  };
}
