"use client";

import { useTheme } from "next-themes";
import {
  Menu,
  Bell,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAccountMenu } from "@/components/layout/user-account-menu";
import type { User as AppUser } from "@/types";

interface HeaderProps {
  user?: AppUser | null;
  menuButtonRef?: React.RefObject<HTMLButtonElement | null>;
  sidebarOpen?: boolean;
  onMenuClick?: () => void;
}

export function Header({ user, menuButtonRef, sidebarOpen, onMenuClick }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const notifications: never[] = [];
  const unreadCount = notifications.length;

  return (
    <header
      aria-label="Application header"
      className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:gap-4 sm:px-4 lg:px-6"
    >
      <Button
        ref={menuButtonRef}
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0"
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        aria-expanded={sidebarOpen ?? false}
        aria-controls="app-navigation"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-sm text-muted-foreground">
              No notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <UserAccountMenu user={user} />
      </div>
    </header>
  );
}
