"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessModule } from "@/lib/role-permissions";
import { getOrderedNavItems, isNavTabActive } from "@/lib/nav-items";
import { useAppStore } from "@/lib/store";
import { COMPANY } from "@/lib/company";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useMobileSidebarInert } from "@/hooks/use-mobile-sidebar-inert";
import type { UserRole } from "@/types";

interface SidebarProps {
  userId?: string;
  role?: UserRole;
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ userId, role, open, onClose }: SidebarProps) {
  const asideRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navOrder = useAppStore((s) => s.navOrder);
  const hiddenNavHrefs = useAppStore((s) => s.hiddenNavHrefs);
  const rolePermissions = useAppStore((s) => s.rolePermissions);
  const userPermissionOverrides = useAppStore((s) => s.userPermissionOverrides);

  const filtered = getOrderedNavItems(navOrder).filter(
    (item) =>
      isNavTabActive(item.href, hiddenNavHrefs) &&
      canAccessModule(
        userId && role ? { id: userId, role } : undefined,
        item.perm,
        rolePermissions,
        userPermissionOverrides
      )
  );

  useMobileSidebarInert(asideRef, open ?? false);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const firstLink = navRef.current?.querySelector<HTMLElement>("a[href], button");
      firstLink?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        ref={asideRef}
        aria-label="Application sidebar"
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-[min(100vw-3rem,17rem)] flex-col bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-300 sm:w-72 lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex min-h-[4.5rem] shrink-0 items-center justify-between border-b border-sidebar-border px-3 py-3">
          <Logo variant="sidebar" showTagline href="/dashboard" className="min-w-0" />
          <button
            type="button"
            className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-border/60 hover:text-sidebar-foreground lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav
          id="app-navigation"
          ref={navRef}
          aria-label="Main navigation"
          className="flex-1 overflow-y-auto overscroll-contain p-3"
        >
          <SidebarNav items={filtered} onNavigate={onClose} />
        </nav>
        <div className="shrink-0 border-t border-sidebar-border p-4">
          <p className="text-center text-[11px] font-medium leading-relaxed text-sidebar-foreground/85">
            {COMPANY.name}
            <br />
            {COMPANY.tagline}
          </p>
          <p className="mt-1.5 text-center text-[10px] tabular-nums text-sidebar-foreground/55">
            {APP_VERSION_LABEL}
          </p>
        </div>
      </aside>
    </>
  );
}
