"use client";

import { SidebarTabsEditor } from "@/components/settings/sidebar-tabs-editor";
import { SettingsPanel, SettingsSection } from "@/components/settings/settings-section";

export function NavigationSettingsPanel() {
  return (
    <SettingsPanel>
      <SettingsSection
        first
        title="Sidebar menu configuration"
        description="Reorder navigation links and control which modules appear in the sidebar. Grouped items roll up under Profiles, Inventory, Operations, and Administration."
        contentClassName="pt-0"
      >
        <SidebarTabsEditor />
      </SettingsSection>
    </SettingsPanel>
  );
}
