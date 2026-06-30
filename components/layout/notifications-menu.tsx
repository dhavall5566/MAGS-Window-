"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

function notificationTypeClass(type: Notification["type"]): string {
  switch (type) {
    case "error":
      return "text-destructive";
    case "warning":
      return "text-amber-600 dark:text-amber-400";
    case "success":
      return "text-emerald-600 dark:text-emerald-400";
    default:
      return "text-muted-foreground";
  }
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (notification: Notification) => void;
}) {
  const content = (
    <div className="flex w-full flex-col gap-0.5 text-left">
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "text-sm font-medium leading-none",
            !notification.read && "text-foreground"
          )}
        >
          {notification.title}
        </span>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {notification.source === "live" ? "Live" : formatRelativeTime(notification.createdAt)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
      <span className={cn("text-[10px] font-medium uppercase tracking-wide", notificationTypeClass(notification.type))}>
        {notification.source === "live" ? "Operational alert" : "Event"}
      </span>
    </div>
  );

  if (notification.href) {
    return (
      <DropdownMenuItem
        className={cn("cursor-pointer items-start py-2.5", !notification.read && "bg-muted/40")}
        onClick={() => onMarkRead(notification)}
        asChild
      >
        <Link href={notification.href}>{content}</Link>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem
      className={cn("cursor-pointer items-start py-2.5", !notification.read && "bg-muted/40")}
      onClick={() => onMarkRead(notification)}
    >
      {content}
    </DropdownMenuItem>
  );
}

export function NotificationsMenu() {
  const { notifications, unreadCount, isLoadingEvents, markRead, markAllRead } =
    useNotifications();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const visibleNotifications = isMounted ? notifications : [];
  const visibleUnreadCount = isMounted ? unreadCount : 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {visibleUnreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-white">
              {visibleUnreadCount > 99 ? "99+" : visibleUnreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {visibleUnreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => void markAllRead()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-80 overflow-y-auto">
          {!isMounted || (isLoadingEvents && visibleNotifications.length === 0) ? (
            <DropdownMenuItem disabled className="text-sm text-muted-foreground">
              Loading…
            </DropdownMenuItem>
          ) : visibleNotifications.length === 0 ? (
            <DropdownMenuItem disabled className="text-sm text-muted-foreground">
              No notifications
            </DropdownMenuItem>
          ) : (
            visibleNotifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onMarkRead={markRead}
              />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
