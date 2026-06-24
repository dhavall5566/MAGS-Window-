"use client";

import { Building2, ListOrdered, User } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CompanySettingsPanel } from "@/components/settings/company-settings-panel";
import { NavigationSettingsPanel } from "@/components/settings/navigation-settings-panel";
import { SettingsTabsList, SettingsTabsTrigger } from "@/components/settings/settings-tabs-nav";
import { UserSettingsPanel } from "@/components/settings/user-settings-panel";

const SETTINGS_TABS = [
  {
    value: "user",
    label: "User",
    description: "Profile & permissions",
    icon: User,
  },
  {
    value: "tabs",
    label: "Tab Settings",
    description: "Sidebar navigation",
    icon: ListOrdered,
  },
  {
    value: "company",
    label: "Company",
    description: "Business information",
    icon: Building2,
  },
] as const;

export default function SettingsPage() {
  return (
    <Tabs defaultValue="user" className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <SettingsTabsList aria-label="Settings sections">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <SettingsTabsTrigger
              key={tab.value}
              value={tab.value}
              description={tab.description}
              icon={<Icon className="h-4 w-4" />}
            >
              {tab.label}
            </SettingsTabsTrigger>
          );
        })}
      </SettingsTabsList>

      <div className="min-w-0 flex-1">
        <TabsContent value="user" className="mt-0 focus-visible:outline-none">
          <UserSettingsPanel />
        </TabsContent>

        <TabsContent value="tabs" className="mt-0 focus-visible:outline-none">
          <NavigationSettingsPanel />
        </TabsContent>

        <TabsContent value="company" className="mt-0 focus-visible:outline-none">
          <CompanySettingsPanel />
        </TabsContent>
      </div>
    </Tabs>
  );
}
