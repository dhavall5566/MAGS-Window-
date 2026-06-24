"use client";

import { ListOrdered } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTabsEditor } from "@/components/settings/sidebar-tabs-editor";

export function NavigationSettingsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-primary" />
          Sidebar Tabs
        </CardTitle>
        <CardDescription>
          Reorder menu links and choose which pages appear in the sidebar. Grouped items
          appear as submenus under Profiles, Inventory, Operations, and Administration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SidebarTabsEditor />
      </CardContent>
    </Card>
  );
}
