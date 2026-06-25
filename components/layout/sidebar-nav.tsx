"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  buildSidebarNavTree,
  isPathActive,
  type NavItemConfig,
  type SidebarNavNode,
} from "@/lib/nav-items";
import { useListKeyboardNav } from "@/hooks/use-list-keyboard-nav";
import { cn } from "@/lib/utils";

const EXPANDED_GROUPS_KEY = "mags-nav-expanded-groups";

function loadExpandedGroups(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(EXPANDED_GROUPS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveExpandedGroups(groups: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EXPANDED_GROUPS_KEY, JSON.stringify([...groups]));
}

interface SidebarNavProps {
  items: NavItemConfig[];
  onNavigate?: () => void;
}

function NavLinkItem({
  item,
  pathname,
  onNavigate,
  nested = false,
  tabbable = true,
}: {
  item: NavItemConfig;
  pathname: string;
  onNavigate?: () => void;
  nested?: boolean;
  tabbable?: boolean;
}) {
  const router = useRouter();
  const Icon = item.icon;
  const active = isPathActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      prefetch
      tabIndex={tabbable ? undefined : -1}
      aria-hidden={tabbable ? undefined : true}
      onMouseEnter={() => router.prefetch(item.href)}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium tracking-wide transition-all duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
        nested && "py-2 pl-3",
        active
          ? "bg-sidebar-accent text-white shadow-sm"
          : "text-sidebar-foreground/90 hover:bg-sidebar-border/80 hover:text-white"
      )}
    >
      <Icon
        className={cn(
          "shrink-0",
          nested ? "h-4 w-4" : "h-[18px] w-[18px]",
          active ? "text-white" : "text-sidebar-foreground/85"
        )}
      />
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}

function NavGroupItem({
  group,
  groupItems,
  pathname,
  expanded,
  onToggle,
  onNavigate,
}: {
  group: SidebarNavNode & { type: "group" };
  groupItems: NavItemConfig[];
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const GroupIcon = group.group.icon;
  const childActive = groupItems.some((child) => isPathActive(pathname, child.href));
  const panelId = `nav-group-${group.group.id}`;
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight" && !expanded) {
      event.preventDefault();
      onToggle();
      window.setTimeout(() => {
        panelRef.current?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });
      }, 50);
    } else if (event.key === "ArrowRight" && expanded) {
      event.preventDefault();
      panelRef.current?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });
    } else if (event.key === "ArrowLeft" && expanded) {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-semibold tracking-wide transition-all duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
          childActive
            ? "bg-sidebar-border/50 text-white"
            : "text-sidebar-foreground hover:bg-sidebar-border/80 hover:text-white"
        )}
      >
        <GroupIcon
          className={cn(
            "h-[18px] w-[18px] shrink-0",
            childActive ? "text-white" : "text-sidebar-foreground/90"
          )}
        />
        <span className="min-w-0 flex-1 truncate">{group.group.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-sidebar-foreground/70 transition-transform duration-200",
            expanded && "rotate-180",
            childActive && "text-white/80"
          )}
        />
      </button>

      <div
        ref={panelRef}
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-trigger`}
        aria-hidden={!expanded}
        hidden={!expanded}
        className={cn(
          expanded ? "block" : "hidden",
          "ml-3 space-y-0.5 border-l border-sidebar-border/60 py-0.5 pl-2"
        )}
      >
        {groupItems.map((child) => (
          <NavLinkItem
            key={child.href}
            item={child}
            pathname={pathname}
            onNavigate={onNavigate}
            nested
            tabbable={expanded}
          />
        ))}
      </div>
    </div>
  );
}

export function SidebarNav({ items, onNavigate }: SidebarNavProps) {
  const pathname = usePathname() ?? "";
  const navListRef = useRef<HTMLDivElement>(null);
  const tree = useMemo(() => buildSidebarNavTree(items), [items]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());

  useListKeyboardNav(navListRef);

  useEffect(() => {
    setExpandedGroups((current) => {
      const stored = loadExpandedGroups();
      const next = new Set([...stored, ...current]);

      for (const node of tree) {
        if (node.type !== "group") continue;
        if (node.children.some((child) => isPathActive(pathname, child.href))) {
          next.add(node.group.id);
        }
      }

      return next;
    });
  }, [pathname, tree]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      saveExpandedGroups(next);
      return next;
    });
  }, []);

  if (tree.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-sidebar-foreground/70">
        No navigation items available for your account.
      </p>
    );
  }

  return (
    <div ref={navListRef} className="space-y-0.5">
      {tree.map((node) => {
        if (node.type === "link") {
          return (
            <NavLinkItem
              key={node.item.href}
              item={node.item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          );
        }

        return (
          <NavGroupItem
            key={node.group.id}
            group={node}
            groupItems={node.children}
            pathname={pathname}
            expanded={expandedGroups.has(node.group.id)}
            onToggle={() => toggleGroup(node.group.id)}
            onNavigate={onNavigate}
          />
        );
      })}
    </div>
  );
}
