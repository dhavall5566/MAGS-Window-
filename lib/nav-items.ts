import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Boxes,
  Layers,
  PackagePlus,
  Warehouse,
  Factory,
  SprayCan,
  BarChart3,
  Users,
  Building2,
  Settings,
  ScrollText,
  BookOpen,
  Recycle,
  ClipboardList,
  FileText,
} from "lucide-react";

export interface NavMenuGroup {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface NavItemConfig {
  href: string;
  label: string;
  icon: LucideIcon;
  perm: string;
  groupId?: string;
  hiddenFromNav?: boolean;
}

export type SidebarNavLink = {
  type: "link";
  item: NavItemConfig;
};

export type SidebarNavGroup = {
  type: "group";
  group: NavMenuGroup;
  children: NavItemConfig[];
};

export type SidebarNavNode = SidebarNavLink | SidebarNavGroup;

export const navMenuGroups: NavMenuGroup[] = [
  { id: "profiles", label: "Profiles", icon: Boxes },
  { id: "inventory", label: "Inventory", icon: Warehouse },
  { id: "operations", label: "Operations", icon: ClipboardList },
  { id: "administration", label: "Administration", icon: Users },
];

const navGroupsById = new Map(navMenuGroups.map((group) => [group.id, group]));

export const defaultNavItems: NavItemConfig[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard" },
  { href: "/profiles", label: "Profile Master", icon: Boxes, perm: "profiles", groupId: "profiles" },
  { href: "/series-name", label: "Series Name", icon: Layers, perm: "series", groupId: "profiles" },
  {
    href: "/purchase-orders",
    label: "Purchase Orders",
    icon: FileText,
    perm: "stock",
    groupId: "inventory",
  },
  {
    href: "/stock-inward",
    label: "Stock Inward",
    icon: PackagePlus,
    perm: "stock",
    groupId: "inventory",
  },
  {
    href: "/stock-master",
    label: "Stock Master",
    icon: Warehouse,
    perm: "stock",
    groupId: "inventory",
  },
  {
    href: "/stock-ledger",
    label: "Stock Ledger",
    icon: BookOpen,
    perm: "ledger",
    groupId: "inventory",
  },
  {
    href: "/consumption",
    label: "Consumption",
    icon: Factory,
    perm: "consumption",
    groupId: "inventory",
  },
  {
    href: "/powder-coating",
    label: "Powder Coating",
    icon: SprayCan,
    perm: "coating",
    groupId: "operations",
  },
  { href: "/challans", label: "Challans", icon: ScrollText, perm: "challans", groupId: "operations" },
  { href: "/scrap", label: "Scrap", icon: Recycle, perm: "scrap", groupId: "operations" },
  { href: "/reports", label: "Reports", icon: BarChart3, perm: "reports" },
  { href: "/users", label: "Users", icon: Users, perm: "users", groupId: "administration" },
  { href: "/vendors", label: "Vendors", icon: Building2, perm: "vendors", groupId: "administration" },
  { href: "/settings", label: "Settings", icon: Settings, perm: "settings" },
];

export const DEFAULT_NAV_ORDER = defaultNavItems.map((item) => item.href);

export const VISIBLE_NAV_ORDER = defaultNavItems
  .filter((item) => !item.hiddenFromNav)
  .map((item) => item.href);

export function getNavGroup(groupId: string): NavMenuGroup | undefined {
  return navGroupsById.get(groupId);
}

export function getNavItem(href: string): NavItemConfig | undefined {
  return defaultNavItems.find((item) => item.href === href);
}

export function isPathActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/profiles" && pathname.startsWith("/profiles/")) {
    return pathname === "/profiles";
  }
  return pathname.startsWith(`${href}/`);
}

export function getOrderedNavItems(
  order?: string[] | null,
  options?: { includeHidden?: boolean }
): NavItemConfig[] {
  const itemsByHref = new Map(defaultNavItems.map((item) => [item.href, item]));
  const effectiveOrder = order?.length ? order : DEFAULT_NAV_ORDER;
  const seen = new Set<string>();
  const ordered: NavItemConfig[] = [];

  for (const href of effectiveOrder) {
    const item = itemsByHref.get(href);
    if (item) {
      ordered.push(item);
      seen.add(href);
    }
  }

  for (const item of defaultNavItems) {
    if (!seen.has(item.href)) ordered.push(item);
  }

  if (options?.includeHidden) return ordered;

  return ordered.filter((item) => !item.hiddenFromNav);
}

export function buildSidebarNavTree(items: NavItemConfig[]): SidebarNavNode[] {
  const nodes: SidebarNavNode[] = [];
  const processedGroups = new Set<string>();

  for (const item of items) {
    if (!item.groupId) {
      nodes.push({ type: "link", item });
      continue;
    }

    if (processedGroups.has(item.groupId)) continue;
    processedGroups.add(item.groupId);

    const group = getNavGroup(item.groupId);
    if (!group) {
      nodes.push({ type: "link", item });
      continue;
    }

    const children = items.filter((entry) => entry.groupId === item.groupId);
    if (children.length === 0) continue;

    if (children.length === 1) {
      nodes.push({ type: "link", item: children[0] });
      continue;
    }

    nodes.push({ type: "group", group, children });
  }

  return nodes;
}

export function isNavTabActive(
  href: string,
  hiddenNavHrefs?: string[] | null
): boolean {
  return !(hiddenNavHrefs ?? []).includes(href);
}

export function getGroupLabel(groupId: string): string {
  return getNavGroup(groupId)?.label ?? groupId;
}
