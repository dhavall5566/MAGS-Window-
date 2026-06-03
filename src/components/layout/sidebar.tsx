"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Images,
  ArrowDownToLine,
  Gauge,
  Paintbrush,
  Trash2,
  BookOpen,
  FileBarChart,
  FileText,
  Users,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@prisma/client";
import { getNavItems } from "@/lib/permissions";
import { MagsLogo } from "@/components/brand/mags-logo";
import { companyInfo } from "@/lib/company";

const iconMap = {
  LayoutDashboard,
  Package,
  Images,
  ArrowDownToLine,
  Gauge,
  Paintbrush,
  Trash2,
  BookOpen,
  FileBarChart,
  FileText,
  Users,
  Settings,
};

interface SidebarProps {
  role: UserRole;
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ role, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItems(role);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-[4.5rem] items-center justify-between border-b border-sidebar-border px-3">
          <Link href="/dashboard" className="flex min-w-0 flex-1 items-center rounded-lg bg-white px-2 py-1.5">
            <MagsLogo variant="compact" className="max-w-full" priority />
          </Link>
          <button onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <p className="text-xs text-sidebar-foreground/60 leading-relaxed">
            {companyInfo.name}
            <br />
            <span className="opacity-80">{companyInfo.phone}</span>
          </p>
        </div>
      </aside>
    </>
  );
}
