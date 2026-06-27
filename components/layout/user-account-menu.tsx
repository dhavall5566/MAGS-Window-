"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { logout } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

function getRoleLabel(role: User["role"] | undefined): string {
  if (role === "administrator") return "Administrator";
  if (role === "store_manager") return "Store Manager";
  return "Production User";
}

function getInitials(user: User | null | undefined): string {
  const fromAvatar = user?.avatar?.trim();
  if (fromAvatar) return fromAvatar.slice(0, 2).toUpperCase();
  const parts = user?.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "U").toUpperCase();
}

interface UserAccountMenuProps {
  user?: User | null;
}

export function UserAccountMenu({ user }: UserAccountMenuProps) {
  const router = useRouter();
  const roleLabel = getRoleLabel(user?.role);
  const initials = getInitials(user);

  const handleLogout = () => {
    logout();
    router.replace("/");
    window.location.assign("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-auto max-w-[240px] gap-2.5 rounded-lg border-border/70 bg-card px-2 py-1.5 shadow-sm",
            "hover:bg-muted/40 data-[state=open]:bg-muted/40"
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 flex-1 flex-col items-start text-left md:flex">
            <span className="truncate text-sm font-medium leading-tight">
              {user?.name ?? "User"}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">{roleLabel}</span>
          </div>
          <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground md:block" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 overflow-hidden p-0">
        <div className="border-b bg-muted/30 px-4 py-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11 shrink-0 border-2 border-background shadow-sm">
              <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-tight">{user?.name ?? "User"}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {user?.email ?? "—"}
              </p>
              <Badge variant="secondary" className="mt-2 text-[10px] font-medium">
                {roleLabel}
              </Badge>
            </div>
          </div>
          {user?.department && (
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Department · </span>
              {user.department}
            </p>
          )}
        </div>

        <div className="p-1.5">
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer rounded-md px-3 py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
