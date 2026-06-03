"use client";

import { useTheme } from "next-themes";
import { Bell, Menu, Moon, Search, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { safeFetchJson } from "@/lib/safe-fetch";
import { fallbackNotifications } from "@/lib/client-fallbacks";
interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<
    { id: string; title: string; message: string; read: boolean }[]
  >([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const res = await safeFetchJson(
        "/api/notifications",
        { notifications: fallbackNotifications },
        (d) =>
          typeof d === "object" &&
          d !== null &&
          Array.isArray((d as { notifications?: unknown }).notifications)
      );
      setNotifications(res.data.notifications ?? fallbackNotifications);
    })();
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <form
        className="hidden flex-1 md:flex md:max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          if (search.trim()) {
            window.location.href = `/profiles?search=${encodeURIComponent(search)}`;
          }
        }}
      >
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Global search profiles..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                  {unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No notifications</p>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start">
                  <span className="font-medium">{n.title}</span>
                  <span className="text-xs text-muted-foreground">{n.message}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings" title="Settings">
            <User className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
